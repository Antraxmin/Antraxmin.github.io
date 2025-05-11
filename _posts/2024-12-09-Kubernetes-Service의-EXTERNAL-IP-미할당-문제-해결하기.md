---
layout: post
title: Kubernetes Service의 EXTERNAL-IP 미할당 문제 해결하기 (+ NodePort와 LoadBalancer는 어떤 차이가 있을까?)
author-id: antraxmin
feature-img: "https://velog.velcdn.com/images/antraxmin/post/ed6d56e9-ce90-4805-8d1a-4d817a578903/image.png"
tags: [AWS, EKS, Kubernetes]
date: 2024-12-08 00:00:00
---


EKS 클러스터에서 서비스에 외부 접근이 불가능한 문제가 발생했다. `kubectl get svc` 명령을 실행했을 때 Service의 EXTERNAL-IP가 `none` 으로 표시되어 외부 클라이언트가 애플리케이션에 접근할 수 상태였다.

```bash
NAME             TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)          AGE
k8s-ssh-server   NodePort    10.100.218.81   <none>        2222:30771/TCP   6s
kubernetes       ClusterIP   10.100.0.1      <none>        443/TCP          44h
```

이 문제는 초기에 Service를 `LoadBalancer` 타입으로 설정했으나, 중간에 `NodePort` 타입으로 변경한 것이 원인이었다. 당시에는 외부 접근이 필요하지 않다고 판단했으나, 이후 요구사항이 생기면서 문제가 발생했다. `NodePort` 타입으로 설정되어 있어 외부 IP를 제공하지 않았고, 이를 `LoadBalancer` 타입으로 변경하여 해결할 필요가 있었다.

다만 단순히 `NodePort` 를 `LoadBalancer` 타입으로 변경하는 해답을 설명하기 위한 것은 아니다. 이번 글에서는 **Kubernetes Service의 타입 선택과 클라우드 환경에서의 활용 방식**에 대해 설명하고, 문제를 체계적으로 분석하고 해결하는 과정을 통해 Kubernetes를 보다 효과적으로 사용할 수 있는 방법을 공유하고자 한다. 


## NodePort와 LoadBalancer 타입의 차이 
### 1) NodePort

`NodePort` 는 Kubernetes Service의 한 종류로, 클러스터 외부에서 애플리케이션에 접근할 수 있도록 각 노드에서 지정된 포트 범위를 열어 외부 트래픽을 Pod로 라우팅하는 방식으로 작동한다. 기본적으로 `NodePort`는 클러스터의 모든 노드에서 특정 포트(기본 범위는  30000~32767)를 열어두며, 외부 사용자는 이 포트를 통해 노드에 접근하게 된다. 이를 통해 클러스터 내부뿐만 아니라 외부에서도 애플리케이션에 접근할 수 있다. 

![](https://velog.velcdn.com/images/antraxmin/post/d0501fcc-1764-4ce2-a9ae-24217103411d/image.png)

특징으로는 사용자가 클러스터 외부에서 애플리케이션에 접근하기 위해 노드의 IP 주소와 `NodePort` 를 알아야 한다는 점이 있다. 그러나 `NodePort` 는 클라우드 환경에서 로드밸런서를 제공하지 않기 때문에 외부 클라이언트는 직접 노드의 IP 주소와 포트를 사용해야 한다. 이로 인해 설정과 관리가 복잡해질 수 있다. 

만약 오토스케일링과 같이 클러스터의 노드가 변경될 경우 노드의 IP 주소가 바뀌기 때문에 안정적인 외부 접근이 어려워진다. 또한 `NodePort는`  DNS 이름을 제공하지 않기 때문에 변경된 노드 IP를 계속해서 수동으로 관리해야 하는 점이 비효율적이다. 이러한 이유로 클라우드 환경에서 외부 트래픽을 처리하기에는 적합하지 않은 경우가 많다. 


### 2) LoadBalancer

LoadBalancer 역시 Kubernetes Service의 한 종류로, 클라우드 환경에서 외부 트래픽을 클러스터 내부의 Pod로 안정적으로 라우팅할 수 있도록 설계된 방식이다. LoadBalancer 타입은 클라우드 제공자가 자동으로 로드밸런서를 생성하며, Service에 외부 IP 주소 또는 DNS 이름을 할당한다. 이를 통해 외부 클라이언트는 로드밸런서를 통해 Kubernetes 클러스터 내부의 Pod에 접근할 수 있다.

좀 더 자세히 알아보면, `LoadBalancer` 서비스는 내부적으로 `NodePort` 와 동일한 방식으로 Pod를 노출시키며, 추가적으로 외부 클라이언트의 요청을 클러스터 내부 Pod로 전달하기 위한 외부 네트워크 인프라를 생성한다. 

![](https://velog.velcdn.com/images/antraxmin/post/36ebb288-d1e5-4683-82c7-a5d7091b7710/image.png)

AWS, Azure, GCP와 같은 클라우드 플랫폼에서는 각 클라우드 제공자의 기존 로드밸런서 서비스를 활용한다. 예를 들어 AWS의 EKS 클러스터는 Elastic Load Balancer(ELB)를 생성하여 Pod를 공용 네트워크 트래픽에 노출시킨다.

EKS에서 `LoadBalancer` 타입의 서비스를 생성하면 AWS Load Balancer Controller가 Network Load Balancer(NLB)를 생성하며, 이는 OSI 모델의 레이어 4에서 트래픽을 로드밸런싱한다. 기본적으로 AWS Load Balancer Controller는 '인스턴스' 타입 타겟을 등록하여 워커 노드의 IP와 NodePort를 타겟으로 설정한다. 

LoadBalancer 서비스가 생성되면 `cloud-controller-manager` 의 `service-controller` 컴포넌트가 클라우드 API와 통신하여 실제 로드밸런서 인스턴스를 프로비저닝하게 된다. 

따라서 CSP 기반의 클라우드 네이티브 환경에서 활용하기에 적합하고, **클러스터의 노드 상태와 관계없이 로드밸런서를 통해 외부 트래픽을 안정적으로 처리할 수 있다는 것**이 장점이다. 클라우드 제공자가 외부 IP 주소나 DNS 이름을 자동으로 생성하고 관리하기 때문에 사용자는 네트워크 설정에 대해 추가적인 부담을 가지지 않아도 된다. 이러한 특성으로 인해 `LoadBalancer` 타입은 외부 접근이 필요한 Kubernetes 애플리케이션에 가장 적합한 선택으로 평가되고 있다. 


## 왜 이러한 문제가 발생했을까? 

다시 문제 상황으로 돌아가 보자. 앞서 살펴본 `NodePort`와 `LoadBalancer` 타입의 차이와 각 타입의 특성을 이해하면 이번 문제의 원인과 해결책이 더욱 명확해진다. 이번 상황에서는 Service를 `NodePort` 타입으로 설정했기 때문에 클러스터 외부에서 접근 가능한 고정된 외부 IP가 제공되지 않았다. 이는 **외부 클라이언트가 애플리케이션에 접근하려면 노드의 IP 주소와 포트를 직접 알아야 한다는 NodePort 타입의 구조적인 한계**에서 비롯되었음을 알 수 있다. 

![](https://velog.velcdn.com/images/antraxmin/post/f6d369ad-c5d4-47c8-89ec-f9f1c2b6c329/image.png)

반면 `LoadBalancer` **타입은 클라우드 제공자가 자동으로 외부 IP를 할당하고 로드밸런서를 생성하여 외부 트래픽을 안정적으로 처리할 수 있는 구조를 제공**한다. 

따라서 문제를 해결하기 위해 Service 타입을 `LoadBalancer` 로 변경했으며, 이 변경을 통해 외부 클라이언트가 Service에 연결할 수 있는 고정된 외부 IP를 할당받을 수 있었다.


---

> 이번 문제 해결은 나에게 단순히 Service 타입을 변경하는 작업 이상의 교훈을 주었다. **Kubernetes에서 Service 타입은 애플리케이션의 접근성에 직접적인 영향을 미치며, 적절한 타입을 선택하지 못하면 클라우드 환경의 장점을 충분히 활용하지 못할 수 있다는 것**을 깨달았다. 
>
> Kubernetes에서 Service를 설정할 때는 **애플리케이션의 요구사항과 배포 환경을 면밀히 분석하여 올바른 타입을 선택하는 것이 필수적**이다. 문제를 해결하면서 단순히 설정 변경 이상의 체계적인 분석이 Kubernetes와 같은 복잡한 시스템에서 정말 중요하다는 것을 느꼈다.

