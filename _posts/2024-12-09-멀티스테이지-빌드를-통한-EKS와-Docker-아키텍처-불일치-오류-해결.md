---
layout: post
title: 멀티스테이지 빌드를 통한 EKS와 Docker 아키텍처 불일치 오류 해결
author-id: antraxmin
feature-img: "https://velog.velcdn.com/images/antraxmin/post/ed6d56e9-ce90-4805-8d1a-4d817a578903/image.png"
tags: [AWS, EKS, Kubernetes]
date: 2024-12-09 00:00:00
---

애플리케이션을 EKS에 배포하는 과정에서 빌드된 실행 파일이 클라우드 환경에서 실행되지 않았고, 다음과 같은 오류가 발생했다. 

```bash
standard_init_linux.go:211: exec user process caused: exec format error
```

이 오류는 **실행 파일이 Kubernetes 노드의 운영 체제 및 아키텍처와 호환되지 않는 포맷으로 빌드되었을 때 발생**한다. `Dockerfile` 설정이 로컬 개발 환경에만 초점이 맞춰져 있었고, 배포 대상 환경인 EKS의 요구 사항을 고려하지 못했기 때문에 발생한 문제였다. 

<br />

## 왜 문제가 발생하는가?

Docker를 사용하여 애플리케이션을 컨테이너화하는 과정을 간단하게 알아보자.

기존의 Dockerfile에는 `GOARCH` 및 `GOOS` 환경 변수를 명시적으로 설정하지 않았다. 기본적으로 Docker 이미지는 **빌드하는 호스트 시스템의 아키텍처와 운영 체제를 기준으로 컴파일**된다. 로컬 개발 환경에서는 문제가 되지 않지만 배포 환경이 로컬과 다를 경우 호환성 문제가 발생할 수 있다. 

아래는 현재 나의 로컬 및 배포 환경이다. 

- 로컬 개발 환경: ARM 기반 프로세서 (Apple Silicon M3)
- 배포 환경: AWS EKS의 Linux 기반 x86_64 아키텍처

로컬 개발 환경이 macOS 또는 ARM 아키텍처일 경우, 기본적으로 빌드된 실행 파일은 macOS 또는 ARM 기반으로 컴파일된다. 하지만  EKS 노드는 대부분 Linux 기반 x86_64 (amd64) 아키텍처를 사용한다. **EKS와 같은 클라우드 환경은 Linux x86_64와 같은 고정된 아키텍처를 사용**하므로 이를 기반으로 실행 파일을 빌드해야 한다. 그러나 기존 Dockerfile은 이러한 차이를 인식하지 못했고, 배포 후 컨테이너가 제대로 시작되지 않는 원인이 되고 말았다. 

이러한 문제를 해결하기 위해 Dockerfile을 수정하여 실행 파일을 EKS 환경에 맞게 빌드하도록 설정해야 했다. 

<br />

## Dockerfile 수정하기
EKS의 기본 아키텍처에 맞게 실행 파일을 빌드하기 위해 `GOOS=linux` 와 `GOARCH=amd64` 로 설정하였다. 

그리고 멀티 스테이지 빌드를 사용해 최적화된 Docker 이미지를 생성하였다. 

```dockerfile
FROM golang:1.23-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o main .

FROM alpine:3.18

WORKDIR /app

COPY --from=builder /app/main .

EXPOSE 2222

CMD ["./main"]
```

- GOOS=linux와 GOARCH=amd64로 설정하여 배포 환경과 호환되는 실행 파일을 생성
- CGO_ENABLED=0 설정으로 C 라이브러리에 의존하지 않는 정적 바이너리를 빌드
- 멀티 스테이지 빌드를 적용하여 첫 번째 단계에서 빌드와 의존성 다운로드를 수행한 후 두 번째 단계에서 빌드된 실행 파일만 포함하여 경량 이미지를 생성
- 배포 이미지를 경량화하기 위해 Alpine Linux 이미지를 사용 

<br />

## 이미지 빌드 및 로컬 테스트
Dockerfile을 수정한 후, 먼저 이미지를 빌드하고 로컬 환경에서 애플리케이션을 테스트해보았다. (`k8s-ssh-server`은 현재 진행중인 프로젝트의 docker 이미지 이름이라 원하는 대로 바꿔주면 될 것 같다.)

```bash
docker build -t k8s-ssh-server:latest .
```

![](https://velog.velcdn.com/images/antraxmin/post/b1ecfdba-c247-437c-ad0f-47a6edc8b49e/image.png)


로그를 통해 데이터베이스 연결, Kubernetes 클라이언트 초기화, SSH 서버 실행이 정상적으로 이루어졌음을 확인했다. 이제 ECR에 이미지를 푸시하고 EKS를 통해 배포하는 과정에서도 문제가 없어야 한다. 

<br />

## EKS Deployment
이미지 빌드와 로컬 테스트가 완료된 후 이미지를 AWS ECR에 푸시하고 EKS 클러스터에 배포하였다. EKS 클러스터에서 Deployment 설정을 업데이트하고 클러스터에 적용한 결과, 아래와 같이 오류 없이 정상적으로 실행되었다. 

```bash
kubectl get deployments
```

```bash
NAME                               READY   STATUS    RESTARTS   AGE
k8s-ssh-server-55779b86c6-abcde    1/1     Running   0          5m
k8s-ssh-server-55779b86c6-fghij    1/1     Running   0          5m
```

- 모든 파드가 정상적으로 실행되었으며 STATUS가 `Running` 으로 표시됨
- 로컬 환경에서 발생했던 `exec format error` 문제는 해결됨

<br />

---

이번 문제를 해결하는 과정에서 로컬 환경과 배포 환경의 프로세서 아키텍처 레벨까지 깊게 생각하지 못했던 것이 원인이었다. 처음에는 단순히 Dockerfile 설정의 문제라고만 생각했는데, 실제로 빌드된 실행 파일이 클라우드 환경의 요구 사항과 호환되지 않는다는 점을 인지하는 데 시간이 꽤나 걸렸다. 앞으로는 개발 단계에서부터 로컬과 배포 환경의 차이를 구체적으로 비교하고, 차이를 기반으로 더 정교한 빌드 및 배포 프로세스를 설계해야겠다. 





