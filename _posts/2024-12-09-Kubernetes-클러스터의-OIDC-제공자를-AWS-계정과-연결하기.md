---
layout: post
title: Kubernetes 클러스터의 OIDC 제공자를 AWS 계정과 연결하기
author-id: antraxmin
feature-img: "https://velog.velcdn.com/images/antraxmin/post/ed6d56e9-ce90-4805-8d1a-4d817a578903/image.png"
tags: [AWS, EKS, Kubernetes]
date: 2024-12-09 00:00:00
---

Kubernetes 클러스터에서 IAM 역할을 사용하려고 시도하는 과정에서 다음과 같은 오류가 발생하였다. 

```bash
An error occurred (InvalidIdentityToken) when calling the AssumeRoleWithWebIdentity operation: No OpenIDConnect provider found in your account for https://oidc.eks.ap-northeast-2.amazonaws.com/id/C891F985BAF5A4C1C7ABBA6A00DFD39E
```

InvalidIdentityToken 오류는 **Kubernetes 클러스터와 연결된 OIDC 제공자가 AWS 계정에 제대로 등록되지 않았거나 OIDC 제공자와 IAM 역할 간의 신뢰 관계가 설정되지 않았을 때 발생**한다. OIDC 제공자가 올바르게 설정되지 않으면 Kubernetes 클러스터 내 서비스 계정이 IAM 역할과 연동되지 않아 AWS 리소스에 접근할 수 없다. 

<br />

## OIDC란 무엇인가? 

![](https://velog.velcdn.com/images/antraxmin/post/fba852ad-9fc1-465a-9861-389b29be52b8/image.png)

OIDC(OpenID Connect)는 OAuth 2.0 기반의 인증 프로토콜로, ID 제공자를 통해 사용자 또는 시스템의 신원을 검증하는 데 사용된다. EKS에서는 OIDC를 활용하여 Kubernetes 클러스터와 AWS의 IAM을 통합할 수 있다. 이 과정은 OIDC 제공자를 통해 서비스 계정의 ID를 AWS IAM에 전달하는 방식으로 작동한다. 

<br />

## 1. OIDC 제공자 생성
EKS는 클러스터 생성 시 자동으로 OIDC 엔드포인트(URL)를 생성한다. 예를 들어 EKS 클러스터의 OIDC 엔드포인트는 다음과 같이 나타난다. 

```bash
https://oidc.eks.<region>.amazonaws.com/id/<cluster-id>
```

**이 URL은 클러스터별로 고유하며, AWS 계정에 등록되어야 클러스터가 IAM 역할과 통신할 수 있다.** AWS CLI를 사용하여 OIDC 제공자를 생성하려면 아래 명령어를 실행한다. 

```bash
aws iam create-open-id-connect-provider \
  --url "https://oidc.eks.ap-northeast-2.amazonaws.com/id/C891F0DFD39E" \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 9e99a48a98c30e34e
```

위 명령은 OIDC URL을 기반으로 AWS 계정에 OIDC 제공자를 등록한다. `--client-id-list` 로는 AWS의 기본 클라이언트인 `sts.amazonaws.com` 을 지정하며, `--thumbprint-list` 는 OIDC 엔드포인트의 SSL 인증서를 검증하기 위한 SHA-1 지문을 제공한다.

<br />

## 2. OIDC 제공자 등록 확인 
OIDC 제공자가 성공적으로 등록되었는지 확인하려면 다음 명령어를 실행한다. 

```bash
aws iam list-open-id-connect-providers --query "OpenIDConnectProviderList[*].Arn" --output text
```

```bash
arn:aws:iam::<account-id>:oidc-provider/oidc.eks.ap-northeast-2.amazonaws.com/id/C891F0DFD39E
```

출력된 ARN이 OIDC URL과 일치하면 OIDC 제공자가 정상적으로 AWS 계정에 등록된 것이다. 이 ARN은 IAM 역할의 신뢰 정책에서 사용된다. (설명을 위해 ARN에 임의의 문자열을 삽입하였다.)

<br />

## 3. IAM 역할과 OIDC 제공자 연결
OIDC 제공자를 AWS 계정에 등록한 후 IAM 역할과 연결해야 Kubernetes 클러스터에서 해당 역할을 사용할 수 있다. 이를 위해 IAM 역할의 신뢰 정책에 OIDC 제공자를 추가한다. 먼저 현재 IAM 역할의 신뢰 정책을 가져와 수정한다. 

```bash
aws iam get-role --role-name my-eks-cluster --query "Role.AssumeRolePolicyDocument" --output json > trust-policy.json
```

IAM 역할의 신뢰 정책을 로컬 파일로 저장한다.

```json
{
    "Effect": "Allow",
    "Principal": {
        "Federated": "arn:aws:iam::<account-id>:oidc-provider/oidc.eks.ap-northeast-2.amazonaws.com/id/C891F0DFD39E"
    },
    "Action": "sts:AssumeRoleWithWebIdentity"
}
```
가져온 신뢰 정책 파일에 OIDC 제공자의 ARN을 포함한다.

```bash
aws iam update-assume-role-policy --role-name my-eks-cluster --policy-document file://trust-policy.json
```

신뢰 정책에 OIDC 제공자를 포함한 후 IAM 역할에 적용한다. 

<br />

## 4. Kubernetes 서비스 계정과 IAM 역할 연결
OIDC 제공자와 IAM 역할 설정이 완료되면 Kubernetes 서비스 계정을 IAM 역할과 연결한다. 이 작업을 통해 Kubernetes 클러스터 내에서 실행 중인 Pod가 AWS 리소스에 접근할 수 있도록 권한이 부여된다. 

먼저 Kubernetes에서 다음과 같이 서비스 계정을 생성하고, 서비스 계정 메타데이터에 IAM 역할의 ARN을 주석으로 추가한다. 

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: my-service-account
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::<account-id>:role/my-eks-cluster-role
```
    
생성된 서비스 계정을 Kubernetes Pod의 `spec.serviceAccountName` 에 명시적으로 지정한다. 이를 통해 해당 Pod는 OIDC 토큰을 사용하여 IAM 역할의 권한을 상속받게 된다. 

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-pod
spec:
  serviceAccountName: my-service-account
  containers:
  - name: my-container
    image: my-image
```

Pod가 시작되면 Kubernetes는 지정된 서비스 계정에 대해 ID 토큰을 발급한다. Pod 내부의 애플리케이션은 이 토큰을 활용해 AWS 리소스에 접근할 수 있게 된다. 

<br/>

---

> OIDC를 연결하면서 배운 점은 **작은 설정 하나의 중요성이 클라우드 환경에서 얼마나 큰 영향을 미칠 수 있는지**를 실감했다는 것이다. 처음에는 단순히 OIDC 제공자를 생성하고 IAM 역할과 연결하면 끝날 일이라고 생각했지만, 각 단계에서의 세부 설정들이 서로 밀접하게 연결되어 있어 단 하나의 누락이나 실수가 전체 프로세스를 중단시킬 수 있음을 깨달았다. 
>
> 또한 **클라우드 환경에서의 신뢰 관계가 단순히 자격 증명 교환을 넘어 프로세스와 프로토콜의 정밀한 협력을 통해 이루어진다는 점**을 이해하게 되었다. EKS에서 OIDC가 작동하는 메커니즘은 처음엔 복잡하게 느껴졌지만 이를 단계적으로 파악해가며 전반적인 시야가 넓어질 수 있었다. 단순히 명령어를 실행하는 것이 아니라 각 설정의 의도와 역할을 이해하는 것이 중요한 것 같다. 