---
layout: post
title: OpenStack 개발 환경 구축 - 1. DevStack 설치
author-id: antraxmin
feature-img: "https://velog.velcdn.com/images/antraxmin/post/ed6d56e9-ce90-4805-8d1a-4d817a578903/image.png"
tags: [openstack, ossca]
date: 2025-04-22 00:00:00
---


첫 주차부터 바로 코드 분석을 위한 개발환경 세팅을 과제로 내주셨다. 학습 자료는 devstack 설치부터 작성되어 있었다. OpenStack 트랙에는 현업 클라우드/DevOps 엔지니어 비율이 상당하기 때문에 리눅스 서버 세팅 등의 기본적인 지식은 이미 알고 있다고 가정하고 진행하는 것 같았다. (오히려 좋아)


사전에 멘토님께서 개인별로 세팅해주신 원격 리눅스 서버의 접속 정보를 가지고 priavte key pem 파일과 ssh 세팅을 완료했다. 이 장비에서 devstack을 설치해볼 것이다.

## DevStack이란?
DevStack은 OpenStack의 개발 및 테스트 환경을 빠르게 구축할 수 있는 스크립트 모음이다. 주로 개발자나 테스터들이 OpenStack의 다양한 기능을 검증하는 용도로 사용된다. 프로덕션 환경보다는 테스트 환경에 적합한 도구이다. 

DevStack으로 구성할 수 있는 주요 OpenStack 컴포넌트는 다음과 같다. 

- `Nova`: 가상 서버 생성 및 관리
- `Glance`: 서버 이미지 관리
- `Cinder`: 블록 스토리지 관리
- `Neutron`: 가상 네트워크 생성 및 관리
- `Keystone`: 사용자 인증 및 권한 관리
- `Swift`: 오브젝트 스토리지
- `Horizon`: 웹 기반 대시보드 (GUI 환경)

## 설치 환경 준비
### 1) swap 공간 설정 
Linux 서버에서 메모리가 부족할 경우를 대비해 swap 공간을 설정한다. 

```bash
sudo fallocate -l 8G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```
OpenStack은 메모리를 많이 사용하는 서비스이다. 특히 개발 환경에서는 여러 컴포넌트가 동시에 실행되기 때문에 물리 메모리가 부족할 수 있다. Swap 공간은 물리 메모리의 확장 개념으로, 디스크 공간을 메모리처럼 활용하여 시스템이 더 많은 프로세스를 동시에 실행할 수 있게 해준다. 성능은 물리 메모리보다 떨어지지만 메모리 부족으로 인한 서비스 장애를 방지할 수 있다.

### 2) Stack 계정 설정
DevStack 설치를 위한 전용 계정을 생성하고 gcc 관련 권한을 조정한다. 

```bash
sudo apt update
sudo apt install -y gcc
sudo chmod o+x $(which gcc)
```
`stack` 사용자 계정을 생성하고 필요한 권한을 설정한다.

```bash
sudo useradd -s /bin/bash -d /opt/stack -m stack
sudo chown stack:stack -R /opt/stack/
echo "stack ALL=(ALL) NOPASSWD: ALL" | sudo tee /etc/sudoers.d/stack
sudo chmod 755 /opt/stack
sudo su - stack
```
DevStack은 권한 문제로 인한 설치 실패를 방지하기 위해 전용 사용자 계정으로 실행하는 것을 권장한다. `stack` 계정은 sudo 권한을 가지며, `/opt/stack` 디렉토리에 대한 완전한 소유권을 갖는다. 이는 설치 스크립트가 필요한 파일을 생성하고 권한을 설정할 때 문제없이 작동하게 하기 위함이다. 특히 gcc에 대한 실행 권한을 모든 사용자에게 부여하는 것은 DevStack 설치 과정에서 필요한 컴파일 작업을 원활히 수행하기 위함이다.

### 3) DevStack 소스코드 다운로드
`stack` 계정으로 전환한 후 DevStack 소스코드를 클론한다. 

```bash
sudo apt-get update
sudo apt install git -y
git clone https://opendev.org/openstack/devstack
cd devstack
git checkout stable/2024.1
```
DevStack은 Git 저장소로 관리되는 스크립트 모음이다. 최신 버전을 가져오기 위해 git을 사용하여 클론하고 안정적인 버전을 사용하기 위해 `stable/2024.1` 브랜치를 체크아웃한다. 이렇게 함으로써 개발 중인 불안정한 코드가 아니라 테스트가 완료된 안정적인 버전의 DevStack을 설치할 수 있다.


## 네트워크 설정
### 1) 가상 브릿지 구성
클라우드 환경에서는 외부 통신을 위한 가상 네트워크 브릿지를 설정해야 한다. 이를 통해 OpenStack의 가상 머신이 외부와 통신할 수 있게 된다. 

```bash
sudo apt install bridge-utils net-tools
sudo brctl addbr mybr0
sudo ifconfig mybr0 192.168.100.1 netmask 255.255.255.0 up
``` 

가상 브릿지(mybr0)는 물리적 네트워크와 OpenStack의 가상 네트워크를 연결하는 다리 역할을 한다. 이 브릿지에 IP 주소(192.168.100.1)를 할당하면 이 IP가 OpenStack 내부의 가상 네트워크와 외부 네트워크 사이의 게이트웨이 역할을 한다. 이는 VM이 외부 네트워크와 통신할 수 있게 해주는 중요한 설정이다.

### 2) 패킷 포워딩 설정
가상 네트워크와 실제 네트워크 간의 통신을 위한 `iptables` 설정을 추가한다. 

```bash
sudo iptables -I FORWARD -j ACCEPT
sudo iptables -t nat -I POSTROUTING -s 192.168.100.0/24 -j MASQUERADE
```
첫 번째 명령은 리눅스 시스템의 패킷 포워딩을 활성화하여 네트워크 트래픽이 가상 네트워크와 실제 네트워크 사이를 이동할 수 있도록 한다. 두 번째 명령은 NAT(Network Address Translation)를 설정하여 가상 네트워크(192.168.100.0/24)에서 오는 패킷의 소스 IP를 호스트 머신의 IP로 변환(MASQUERADE)한다. 이를 통해 가상 머신이 인터넷에 접속할 때 호스트의 IP를 빌려 사용할 수 있게 된다.


### 3) 공인 IP 설정
클라우드 인스턴스의 공인 IP를 루프백 인터페이스에 추가하여 OpenStack 서비스가 외부에서 접근 가능하도록 한다. 

```bash
sudo ip addr add $할당받은_공인_IP/32 dev lo
```
OpenStack 서비스가 외부에서 접근 가능하려면 공인 IP로 바인딩되어야 한다. 루프백 인터페이스(lo)에 공인 IP를 추가함으로써 해당 IP로 들어오는 요청을 로컬에서 처리할 수 있게 된다. 특히 Horizon 대시보드와 같은 웹 인터페이스를 외부에서 접근할 때 필요하다.

## OpenStack 설치 구성
### 1) local.conf 설정
DevStack 설치의 핵심은 `local.conf` 파일 구성이다. 이 파일에 설치할 컴포넌트와 네트워크 설정 등을 지정한다.

```bash
cd /opt/stack/devstack
vi local.conf
```
아래 내용으로 `local.conf` 파일을 작성한다.

```bash
[[local|localrc]]
HOST_IP=$할당받은_공인IP
FORCE=yes
ADMIN_PASSWORD=$패스워드_설정
DATABASE_PASSWORD=$ADMIN_PASSWORD
RABBIT_PASSWORD=$ADMIN_PASSWORD
SERVICE_PASSWORD=$ADMIN_PASSWORD

disable_service etcd3

## Neutron options
Q_USE_SECGROUP=True
FLOATING_RANGE="192.168.100.0/24"
IPV4_ADDRS_SAFE_TO_USE="10.0.0.0/22"
Q_FLOATING_ALLOCATION_POOL=start=192.168.100.50,end=192.168.100.250
PUBLIC_NETWORK_GATEWAY="192.168.100.1"
PUBLIC_INTERFACE=mybr0

# Open vSwitch provider networking configuration
Q_USE_PROVIDERNET_FOR_PUBLIC=True
OVS_PHYSICAL_BRIDGE=br-ex
PUBLIC_BRIDGE=br-ex
OVS_BRIDGE_MAPPINGS=public:br-ex
```

local.conf 파일은 DevStack의 설치 동작을 제어하는 중요한 설정 파일이다. 주요 포인트는

- `HOST_IP`: OpenStack 서비스가 바인딩될 IP 주소로, 외부에서 접근 가능한 공인 IP여야 한다.
- `ADMIN_PASSWORD`, `DATABASE_PASSWORD` 등: 각 서비스에서 사용할 비밀번호를 설정한다. 보안을 위해 모두 다른 값을 사용하는 것이 좋지만 개발 환경에서는 편의를 위해 동일한 값을 사용하기도 한다.
- `FLOATING_RANGE`: 가상 머신에 할당할 수 있는 유동 IP 주소 범위를 정의한다. 이는 가상 머신이 외부와 통신할 때 사용된다.
- `Q_FLOATING_ALLOCATION_POOL`: 실제로 할당 가능한 IP 주소의 시작과 끝을 지정한다.
- `OVS_BRIDGE_MAPPINGS`: 물리 네트워크 인터페이스와 Open vSwitch 브릿지 간의 매핑을 정의한다. 이를 통해 가상 네트워크와 물리 네트워크가 연결된다.


## DevStack 설치 실행
모든 준비가 완료되었으면 `stack.sh` 스크립트를 실행하여 설치를 시작한다.

```bash
./stack.sh
```

설치 과정에서 문제가 발생할 경우 아래 명령어로 설치를 초기화한 후 다시 시도할 수 있다. 

```bash
./clean.sh
./stack.sh
```

`clean.sh` 스크립트는 이전 설치 과정에서 생성된 모든 구성 요소를 삭제하여 깨끗한 상태에서 다시 설치할 수 있게 해준다. 설치 중 오류가 발생했거나 설정을 변경하고 싶을 때 유용하다.

설치가 정상적으로 완료되면 다음과 같은 정보가 표시된다.

<img src="https://velog.velcdn.com/images/antraxmin/post/063047e7-5b8c-460d-94a7-781c54452eae/image.png">


## 대시보드 접속 및 테스트
이제 웹 브라우저에서 Horizon 대시보드(http://[공인IP주소]/dashboard)에 접속하여 admin 계정으로 로그인하면 OpenStack 환경을 사용할 수 있다. 가상 서버 생성, 블록 스토리지 생성 및 인스턴스 연결, 가상 네트워크 및 라우터 설정, VM 이미지 업로드 및 관리 등 많은 기능을 테스트해볼 수 있다. 

![](https://velog.velcdn.com/images/antraxmin/post/bfb4d542-b9d2-4e24-9662-c513fb960c38/image.png)


여기까지 대략 한시간 정도 걸렸다. DevStack 설치 자체는 스크립트가 자동으로 진행하기 때문에 크게 어렵지 않았지만 네트워크 설정이나 `local.conf` 파일 구성 과정에서 개념을 이해하는 데 시간이 좀 걸렸다. 특히 가상 브릿지와 패킷 포워딩 설정을 통해 클라우드 환경에서 네트워크가 어떻게 작동하는지 제대로 이해할 수 있었다. 내일 정기모임에서도 빡집중해서 최대한 많은 걸 얻어야겠다. 