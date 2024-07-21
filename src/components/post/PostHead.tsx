import styled from 'styled-components'
import React from 'react'

type PostHeadProps = {
  title: string
  category: string[]
  date: string
  thumbnail: any 
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 50px;
  padding-top: 0px;
  border-radius: 20px;

  @media (max-width: 768px) {
    padding-left: 0px;
    padding-right: 0px;
  }
`

const Title = styled.div`
  display: -webkit-box;
  max-height: 2.4em;
  overflow: hidden;
  font-size: 30px;
  font-weight: 700;
  color: #000000;
  text-overflow: ellipsis;
  word-wrap: break-word;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.2em;

  @media (max-width: 768px) {
    font-size: 25px;
  }
`

const Information = styled.div`
  display: flex;
  justify-content: space-between;
  padding-bottom: 15px;
  border-bottom: 1px solid #000000; 
  font-size: 15px;
  font-weight: 300;
  color: #000000; /* 텍스트 색상 설정 */
`

const Category = styled.div`
  display: flex;
  gap: 7px;
`

export default function PostHead({
  title,
  category,
  date,
}: PostHeadProps) {
  return (
    <Wrapper>
      <Title>{title}</Title>

      <Information>
        <Category>
          {category.map(item => (
            <div key={item}>#{item}</div>
          ))}
        </Category>
        <div>{date}</div>
      </Information>
    </Wrapper>
  )
}
