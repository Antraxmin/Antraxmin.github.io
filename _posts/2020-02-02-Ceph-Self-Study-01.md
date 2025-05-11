---
layout: post
title: Ceph Self Study 01
author-id: sungup
#feature-img: "assets/img/posts/2019-12-23-prometheus-and-grafana-banner.jpeg"
tags: [Ceph, Object Storage]
date: 2020-02-02 00:00:00
---

I'm sorry, these contents are Korean only!!

K8s 관련 셀프 스터디를 진행중이었지만, 현재 업무 관련 Follow-up에 관련 배경지식이 부족한 부분이 있어 Ceph관련 배경지식
확보를 위해 Ceph 관련 스터디 내용을 먼저 진행 합니다.

## Introducing Ceph Storage

### Intro

#### Ceph의 특징

Open, Scalable, Distributed Nature

- 최신의 Scalable, scale-out infrastructure에 잘 어울림.
- Multi-tenancy 같은 특징으로 IaaS와 PaaS에 가장 잘 어울림
  - OpenStak의 60%에서 Storage IaaS로 사용

#### 장점

- 모든 Component들이 Scalable
- Single-point error에 강함
- Software-based, Opensource, adaptable
- Vendor Lock-in Free, Run on the Commodity Hardware
- self-manageable

막강한 Scalablity와 Flexibility로 Storage Silo에서 이전하는데 유리. Block, File, Object
Storage를 다양한 Back-end를 통해 제공 가능.

Object 기반으로 Storage가 구성이 되므로, 물리적인 Dependency에서 자유로울 수 있으며, 성능과 용량에 있어 선형 증가가
가능한 구성을 갖고 있음.

### The history and evolution of Ceph

History

- @Lawrence Livermore National Laboraroty (2003~2007)
  - 2003년: Sage Weil에 의해 개발, (40k lines)
  - 2006년: LGPL 라이선스로 공개됨.
- @DreamHost (2007~2011)
  - Staibility & Reliability 부분에서 개선.
- @InkTank (2012~2013)
  - 영역 확장을 위해 다양한 기능 및 툴 부분 개선
- @RedHat (2014~)

문어 관련 동물들의 이름으로 Code Name이 배정. Ceph는 UCSC의 마스코드인 Sammy와 연결되도록 이름이 선택

추가로 Ceph는 약자가 아니기 때문에 ~~CEPH~~로 표현하면 안됨

### Ceph release

Relase Rule은 리눅스 기반 다른 솔루션들과 유사한 방법으로 버전명을 배정함

- 기본적으로 Numeric Version으로 관리되며, 각 메이저 버전은 두족류 생물의 알파벳 첫글자 순으로 이름이 배정
- Luminous ~ Mimic
  - Luminous 이후 Ceph Community는 1년에 두번 Major 버전을 Tagging 함. (LTS, Stable 버전)
  - 최근 두버전의 LTS 버전에 대해서는 공식 지원을 하지만, Stable 버전은 최시 1개만 지원하게 됨
- Mimic ~ 현재
  - Major Release의 번호별 LTS와 Stable 구분이 사라짐
  - Release 9개월 이후 LTS 버전으로 변경됨

버전 Rule: `v{Major Release}.{Release Type}.{Point Release}`

- Major Number: 코드명의 알파벳 순서와 일치 *(Luminous: v12, Mimic: v13, Nautilus: v14)*
- Release Type: 아래 3가지만 존재
  - 0: Early Version, Pre-release상태의 Code
  - 1: Release Candidate, Cluster Test용이거나 사전 테스트용
  - 2: General-Available, Production-Ready

### New since the first edition

기능적인 차이점은 여기서 확인: <https://docs.ceph.com/docs/master/releases/#active-releases>

### The future of storage

- Enterprise Storage의 요구도가 크게 증가 (대형 Enterprise의 Data 크기가 매해 40~60% 증가)
- But, 전통적인 Storage Solution은 Scalability와 기능성, Vendor Lock-in 문제점 존재
- Modern Storage로 필요한 요구사항은 Exabyte 수준으로 통합, 분산, 신뢰성, 성능 모두를 필요로 함

이러한 요구사항에 대응할 수 있는 Ceph의 잠재성에 Linux Kernel에 Ceph 지원 기능이 들어감 (2008년~)

### Ceph as the cloud storage solution

- Cloud의 인프라에서 매우 중요한 요소이며 TCO에서 영향성이 매우 큼
  - 기존 Storage Solution에서도 Cloud Framework 통합을 제공하지만
  - 시스템에 대한 장기적인 배포, 확장, 축소 등에 있어 비용이 많이 듦
- Cloud 영역에서 Ceph가 빠르게 발전
  - OpenStack, CloudStack, OpenNebula와 같은 오픈소스 기반 클라우드 솔루션 플랫폼에서 선호됨
    - OpenStack에서 Swift와 Cinder 등의 솔루션의 백엔드로 활용
    - OpenStack의 Swift Interface를 지원
    - Volume Service인 Cinder와 Image Service인 Glance를 위한 Volume 서비스를 RBD (RADOS
      Block Device)로 지원.
      - Thin provisioning된 Snapshot과 효율적인 Volume 복제 기능 지원
  - Canonical, Red Hat, SUSE와 파트너십 구축
- Ceph Backend 상에서 Cloud 환경에서 필요로 하는 SaaS 및 IaaS 구축시 필요란 유연성 제공
- Ceph를 손쉽게 구축 및 운영을 위한 다양한 기능들 제공
  - Dell **Crowbar**, Red Hat **Ansible**, Canonical **Juju**: OpenStack을 위한
    Ceph 스토리지 구축 지원
  - Puppet, Chef, SaltStack: Ceph의 자동화 배포에서 활용

### Ceph is software-defined

- SDS (Software-define Storage)의 선호도가 스토리지 인프라 설계자 들에게 점점 선호됨
- SDS로서 Ceph의 장점
  - Open Source Software
  - Commodity HW에서 동작
  - No Vendor Lock-in
  - Low cost / GB *(하지만, 운영 개발에 필요한 인력비 생각하면 vendor 시스템과 큰 차이 없음 by 작성자 생각)*

Ceph의 가장 큰 장점은 적절하게 잘 관리되고 있다는 대 전재 하에서 일반적인 HW 시스템을 활용해서 높은 Scalability를
활용하여 좀더 최적화 된 Storage 환경을 영속성 있게 제공해 줄 수 있다는 것으로 보임. 단, 이를 위해서는 충분한 경험을 지닌
Stoage 관련 개발팀이나 운영팀이 반드시 필요로 하기 때문에 HW/SW 자체에 대한 도입/운영비는 낮을 수 있지만, 전체 TCO입장에서
Ceph가 결고 낮은 비용이 든다고 만 할 수 없음. (대용량 데이터를 운영하는 시점에서 해당 업체에서 기대되는 관련 업무 담당자들의
직급에 따른 연봉을 보면 결코 낮은 비용이 아님)

즉, 스토리지 솔루션에 대해 비용보다는 영속성과 유연성을 필요로 하는 경우 환경, 특히나 Cloud Platform 환경,에서 Ceph가
적절한 대안은 될 수 있지만, 순수하게 비용만 두고 필요로 한다면 Ceph보다는 Vendor에서 제공하는 스토리지 솔루션을 활용하는 편이
좀더 나은 대안이 될 수도 있음.

### Ceph is a unified storage solution

- Storage Solution은 크게 NAS (Network Attached Storage)와 SAN (Storage Area Network)로 구분
- Ceph: 다양한 형태 (Block/File/Object) 형태로 NAS/SAN의 특성을 제공가능
  - RESTful 인터페이스를 통해 관리되어 상위단에서는 Storage의 Kernel이나 File system의 차이를 회피할 수 있음
  - Object-Backend Application의 경우 Block Volume의 제한에 대한 한계관리가 필요 없음 *(???)*
  - Volume에 대한 in-place 확장을 단순하고, 빠르고 무중단 상태에서 처리가 가능
  - LVM 대비 관리 난이도를 낮출 수 있음

Ceph는 기본 Low-level의 RADOS 객체를 관리하고 있으며, 이 위에 Block/File/Object 서비스로 정의됨.

### The next-generation architecture

- Traditional Storage System
  - 중앙관리적인 Metadata 관리 -> 도메인 성장에 따라 Metadata 관리 부분이 병목점으로 변함
- Ceph: CRUSH (Controlled Replication Under Scalable Hashing) 알고리즘으로 관리
  - 데이터의 위치에 대해 독립적으로 계산할 수 있음 *(GlusterFS의 그것과 유사)*
  - 메터데이터를 동적으로 파생할 수 있음
- CRUSH: Storage의 인프라 스트럭처 구성요소를 바탕으로 제어됨
  - Drive, Node, Chassis, Rack, Pool, Network Switch Domain, CD Raw, Room,
    Building, etc...
  - 따라서, 다양한 구성요소가 장애가 나더라도, 이미 복제된 데이터들을 통해 이를 복구.
  - Ceph의 백엔드와 클라이언트가 CRUSH 맵의 사본을 고유하기 때문에 Client가 별도의 중앙 메타 데이터 조회 없이
    데이터 위치를 CRUSH 맵을 이용해 직접 계산하여 접근하게 됨
  - Self-Management 및 Self-Heal 지원
    - 장애 발생 시 CRUSH Map에 정의된 배치/복제 규칙에 다라 영향성 파악 (Self-Management)
    - 관리자의 개입없이 복구를 수행하게 됨 (Self-Heal)
    - 제대로 작성된 CRUSH Map과 Rule Set는 2개이상의 사본을 유지하면서 데이터 손실을 방지

### RAID: the end of an era

RAID: 현재까지 자주 사용되는 Storage의 기본 기술

- 단, Disk의 성능/용량의 변화로 인해 다양한 문제점 발생
  - Failure 발생 시 지나치게 비대해진 디스크의 크기로 복구시간이 매우 길어짐
  - 이로 인한 복구중 Failure에 매우 민감해짐
  - 복구 중에 발생하는 Performance Down을 피할 수 없음
  - Hot-Spare Provisioning이 필요하지만 TCO에 영향을 미침
  - 용량과 성능을 반드시 일치시켜야 하기 때문에 구성이 까다로워짐
  - bit-flip error 발생에 따른 탐지나 오류수정이 제공되지 않음
    - Ceph에서는 주기적으로 checksum을 검사하는 scrub 작업을 주기적으로 실행
  - 성능 및 용량에 대한 확장이 필요하면 고가의 HBA솔루션에 지나치게 의존적이게 됨
  - Disk Failure에 대한 고장만 방지 (Storage **solution** 으로서의 다양한 문제 방지는 대상외)

RAID 대비 Ceph의 장점

- Erasure Coding을 포함한 다양한 Data 복제 제공
- RAID를 사용하지 않기 때문에 RAID에 의한 제약사항에서 자류로움
- 특별한 HW를 필요로 하지 않음
- 다양한 데이터에 대한 요구사항에 맞춰 관리자가 다양한 데이터 보호 전략을 구성할 수 있음
- RAID 대비 Data Failure에 엄청 강함
  - Disk Failure 뿐만 아니라 CRUSH MAP을 통해 데이터가 분산되어 있어 Server나 Domain Level의 장애에도
    대응이 가능
  - 또한 분산 복제된 데이터들을 활용하여 성능 병목현상을 최소화 하여 복구작업을 진행할 수 있음
- Failure에 대비한 여분의 Hot-Spare 드라이브를 필요로 하지 않음
- 디스크 Drive보다 더 작은 단위로 관리를 하기 때문에 Drive의 크기에 따른 비효율성 회피 가능
  - CRUSH MAP을 통해 더 적절히 나누어지기 때문에 용량에 따른 성능 저하등을 회피할 수 있음
    *(데이터에 대한 분배량 자체가 달라진다는 의미로 보임)*
- Erasure Coding 지원 (FEC; Forward Error Correction)
  - Data에 대해 Erasure-coded pool을 두처 Replicated Pool 대비 더 적은 용량으로 운영 가능
  - Data Failure 시에는 Algorithm을 통해 재생성된 데이터를 통해 복구 가능
  - Cluster내 서로 다른 Pool에 대해서 Erasure-code/Replication Pool을 동시 운영 가능

### Ceph Block Storage

- Block Storage개요: SAN 사용자에게 친숙한 기술 *(iSCSI의 컨셉으로 활용되는 무언가..)*
  - 최대 16 Exabyte 제공 가능
  - KVM/QEMU와 같은 가상화 환경에서 IDE/SATA/SCSI 형태의 Volume을 제공할 수 있음 *(librbd)*
  - Baremetal 상에서도 Linux Kernel에 포함된 Ceph Driver로 Block Device 를 바로 맵핑할 수 있음
- RBD: RADOS Block Device
  - Ceph Cluster 안에 RBD Volume이 CRUSH Map을 통해 효과적으로 분산저장됨
  - 안정적이고 분산된 고성능 볼륨을 제공
  - 제공 기능: Incremental/Full Volume Snapshot, Thin Provisioning, Copy-on-Write cloning
    layering, etc...
  - RBD Client에서 In-Memory caching을 통해 성능 향상이 가능
- With OpenStack
  - Cinder 및 Glance의 Back-end 용으로 RBD 활용
  - Copy-on-Write를 통한 신속한 Instance 기동이 가능

### Ceph compare to other storage solution

- Traditional Storage의 경우 다양한 문제점 존재 (License, EOL, Maintenance Fee, etc...)
- Ceph는 Open Source 이기 때문에 License 만료가 없으며, 필요시 Code 수정/기여 가능
- Open Source 솔루션 자체의 활용도가 커지고 있음

#### GPFS (General Paralle File System)

- IBM이 개발한 분산파일 시스템 (IBM Spectrum Scale)
  - Licensing 및 고가 Storage HW 필요
  - RESTful API 및 Block Stroage 기능은 제공하지 못함

#### iRODS (Integrated Rule-Oriented Data System)

- BSD 기반 데이터 관리 시스템
  - 가용성이 높지 않고 중앙관리라 Bottelneck 이 존재 (iCAT이 SPoF에 약하기 때문으로 보임)
  - GPFS와 마찬가지로 RESTful API와 Block Storage 기능은 제공 못함
  - 구성 특징 상 다수의 Mixed/Large file 관리에 유리

#### HDFS

- Java로 구현된 Hadoop 용 분산 파일 시스템
  - 비 POSIX, Block Storage 기능 제공 불가, 가용성이 높지 않음
  - 단일 Namenode 구성 시 SPoF 및 병목현상 발생
  - Hadoop 처리 목적으로 적은수의 Large file 관리에 유리

#### Lustre

- GNU 라이선스 기반 Parallel-distributed filesystem
  - 단일 메타데이터 서버를 활용으로 인한 성능 저하 발생 가능
  - HDFS와 iRODS와 마찬가지로 적은 수의 Large file관리에 유리
  - 장애감지 및 수정 메커니즘 부제로 Node 장애 발생 시 Client가 알아서 다른노드에 연결해야 함

#### GlusterFS

- Scale-out Network-attached File System
  - 지리적으로 분산된 Rack의 Data 복제본 저장에 대한 전략을 관리자가 결정해야 함
    *(distribution order 관련인 듯)*
  - Block Access, Remote Replaction등을 제공하지 않음 *(기본이 Network Filesystem 이니)*

#### Ceph

기본적인 내용은 앞에 모두 나와 있음

- 추가 내용
  - SPoF에 매우 강하다 보니, 시스템 전반에 대한 Rolling upgrade에 있어서 매우 유용
  - Storage 성능 및 용량에 대한 점진적 확장이 쉬움
  - 이를 활용하여 특정 성능/용량에 대한 별도의 Pool을 만들어 관리 운영이 가능

## Reference

- [Learning Ceph - Second Edition]

[Learning Ceph - Second Edition]: https://www.packtpub.com/virtualization-and-cloud/learning-ceph-second-edition
