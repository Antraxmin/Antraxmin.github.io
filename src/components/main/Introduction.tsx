import styled from 'styled-components'
import { StaticImage } from 'gatsby-plugin-image'
import React from 'react'

const ProfileImage = styled.div`
  overflow: hidden;
  width: 140px;
  height: 140px;
  margin-bottom: 30px;
  border-radius: 50%;

  @media (max-width: 768px) {
    width: 100px;
    height: 100px;
  }
`

const SubText = styled.div`
  font-size: 30px;
  font-weight: 100;

  @media (max-width: 768px) {
    font-size: 20px;
  }
`

const MainText = styled.div`
  font-size: 40px;
  font-weight: 700;
  margin-bottom: 30px;

  @media (max-width: 768px) {
    font-size: 25px;
  }
`

export default function Introduction() {
  return (
    <div>
      <ProfileImage>
        <StaticImage src="../../images/profile.jpg" alt="Profile Image" />
      </ProfileImage>

      <SubText>I&apos;m Antraxmin</SubText>
      <MainText>Junior Software Engineer</MainText>
    </div>
  )
}
