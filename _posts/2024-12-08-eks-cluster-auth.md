---
layout: post
title: EKS 클러스터 인증 문제 해결하기 - IAM Authenticator
author-id: antraxmin
feature-img: "https://velog.velcdn.com/images/antraxmin/post/ed6d56e9-ce90-4805-8d1a-4d817a578903/image.png"
tags: [AWS, EKS, Kubernetes]
date: 2024-12-08 00:00:00
---


EKS 클러스터에 연결하기 위해 `kubectl get nodes` 명령을 실행했을 때, 아래와 같은 에러 메시지가 출력되었다. 

## 오류 분석

```bash
E1203 15:24:22.135956    5061 memcache.go:265] couldn't get current server API group list: the server has asked for the client to provide credentials
...
error: You must be logged in to the server (the server has asked for the client to provide credentials)
```

이 오류 메시지는 `kubectl` 이 Kubernetes API 서버와 통신하는 데 필요한 인증 정보를 제공하지 못했음을 나타낸다. EKS는 표준 Kubernetes와 달리 **AWS IAM을 통한 인증**을 사용하므로 이 둘 간의 통합 지점에서 문제가 발생했을 가능성이 높다.  

## 문제를 해결해보자
### 1. AWS CLI 인증 환경 검증
AWS CLI가 올바르게 구성되었는지 확인하는 것이 첫 번째 단계이다.


```bash
aws sts get-caller-identity
```

![](https://velog.velcdn.com/images/antraxmin/post/84326619-d551-44a4-83ea-7706b7ee3b03/image.png)

AWS CLI가 올바른 자격 증명으로 구성되었음을 확인했다. 추가적으로 AWS CLI 구성 파일을 확인할 수 있다. 

```bash
cat ~/.aws/credentials
cat ~/.aws/config
```

명령 결과는 올바른 AWS 계정과 IAM 사용자를 반환하고 있기에 AWS CLI 인증에는 문제가 없음을 확인할 수 있었다. 

### 2. IAM 권한 구조 분석

EKS 클러스터에 접근하려면 IAM 사용자 또는 역할에 다음과 같은 정책이 포함되어야 한다. 

> - AmazonEKSClusterPolicy
- AmazonEKSWorkerNodePolicy
- AmazonEKSServicePolicy (서비스 역할에 필요)
- AmazonEKSVPCResourceController (선택적)

![](https://velog.velcdn.com/images/antraxmin/post/1ca87ff4-f026-4fbb-8fe1-c0aba8c049a4/image.png)

IAM 콘솔에서 사용자의 정책을 확인한 결과 필요한 권한이 모두 포함되어 있었다. 따라서 IAM 권한 문제도 원인이 아니었다. 

### 3. kubectl 구성 및 kubeconfig 파일 상세 분석

EKS 클러스터를 설정하기 전에 로컬에서 Minikube를 사용한 적이 있었기에, `kubeconfig` 파일이 올바르게 구성되지 않았을 가능성을 의심해봤다. 따라서 아래 명령을 통해 현재 `kubectl` 컨텍스트를 확인했다. 


```bash
kubectl config view
kubectl config current-context
kubectl config get-contexts
```

![](https://velog.velcdn.com/images/antraxmin/post/5df5cf2d-21f9-4820-a305-3939d7ba03bf/image.png)

`kubeconfig` 파일을 재생성하고 `kubectl` 컨텍스트를 확인해봤지만 컨텍스트가 EKS 클러스터를 올바르게 가리키고 있는 것으로 보였다. 


```bash
aws eks describe-cluster --name YOUR_CLUSTER_NAME --region YOUR_REGION
```
클러스터 상태 역시 활성화되어 있었지만 문제는 여전히 해결되지 않았다. `kubectl` 명령을 여러번 다시 실행해도 동일한 오류가 계속 발생했다. 


### 4. AWS IAM Authenticator 검증 및 문제 해결
문제를 해결하기 위해 추가적인 로그를 확인한 결과, 예상치 못한 원인은 바로 **AWS IAM Authenticator** 에서 발생했다는 것을 알게 되었다. AWS IAM Authenticator는 **Kubernetes의 RBAC 권한을 AWS IAM을 통해 제어할 수 있도록 해주는 도구**인데, EKS 클러스터와 통신하기 위해 올바르게 설정되어 있어야 정상적으로 동작한다. 


분명 중간에 Authenticator를 설치했던 것으로 기억하는데, 설치 과정 자체에서는 문제가 없어서 의심하지 않고 있었다. 일단 AWS IAM Authenticator가 올바르게 설치되어 있는지 확인했다. 

```bas
hwhich aws-iam-authenticator
aws-iam-authenticator version
```

![](https://velog.velcdn.com/images/antraxmin/post/844a8938-4db7-4c93-9056-6fe64a74344e/image.png)

error라는 익숙한 단어가 보였다. 구글링해보니 실행 가능한 바이너리가 아닌 다른 형식으로 다운로드된 것 같다고 한다. (대체 뭘 다운로드받은거지) 일단 관련된 파일을 모두 지웠다. 


```bash
kubectl --v=9 get nodes
```

디버깅을 위해 로그를 분석해본 결과 AWS IAM Authenticator 바이너리에 문제가 있음을 확인했다. 파일을 검사했을 때 실행 가능한 바이너리가 아닌 다른 형식으로 다운로드되었을 가능성이 있다고 한다. 

문제를 해결하기 위해 AWS IAM Authenticator를 완전히 제거하고 공식 소스에서 올바른 바이너리를 다시 설치했다. 

```bash
rm $(which aws-iam-authenticator)
curl -o aws-iam-authenticator https://github.com/kubernetes-sigs/aws-iam-authenticator/releases/latest/download/aws-iam-authenticator-darwin-amd64
chmod +x aws-iam-authenticator
sudo mv aws-iam-authenticator /usr/local/bin/
```

```bash
aws-iam-authenticator help
```



이제 명령 결과가 정상적으로 출력된다. 

![](https://velog.velcdn.com/images/antraxmin/post/62d32ffc-261a-497a-85f1-6795413254f0/image.png)

새로 설치된 AWS IAM Authenticator로 EKS 클러스터에 연결을 시도했고, 
`kubectl get nodes` 명령을 재실행했을 때 정상적으로 클러스터 노드 정보를 가져올 수 있었다. 

![](https://velog.velcdn.com/images/antraxmin/post/5bb328a1-c2d2-4592-8f90-bac785ea507f/image.png)


## 핵심 정리 
이 문제는 AWS EKS의 인증 아키텍처는 다음과 같이 작동한다. 

1. 사용자가 `kubectl` 명령을 실행
2. kubectl은 `AWS IAM Authenticator` 를 호출하여 현재 AWS 자격 증명으로 인증 토큰을 생성
3. AWS IAM Authenticator는 `AWS STS` 를 사용하여 사용자의 자격 증명을 검증하고 토큰을 생성
4. 생성된 토큰을 EKS 클러스터의 Kubernetes API 서버로 전송
5. API 서버는 aws-auth ConfigMap을 참조하여 IAM 엔티티(사용자 또는 역할)를 Kubernetes RBAC 권한에 매핑



