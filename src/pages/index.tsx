import { useState } from 'react'
import { PageProps, graphql } from 'gatsby'
import Introduction from '../components/main/Introduction'
import Category from '../components/main/Category'
import React from 'react'
import { styled } from 'styled-components'

const Postlist = styled.div`
  display: flex;
  flex-direction: column;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 40px;
`

const Postbox = styled.div`
  @media (min-width: 768px) {
    display: flex;
    justify-content: space-between;
  }
`

const Titlebox = styled.div`
  font-weight: 400;
`

const Datebox = styled.div`
  font-size: 12px;

  @media (min-width: 768px) {
    font-size: 15px;
  }
`

export default function Index({
  data: {
    allContentfulPost: { nodes },
  },
}: PageProps<Queries.IndexPageQuery>) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All')

  const categories = nodes.reduce<Record<string, number>>(
    (categories, post) => {
      post.category
        ?.filter((category): category is string => !!category)
        .forEach(
          category => (categories[category] = (categories[category] ?? 0) + 1),
        )

      return categories
    },
    { All: nodes.length },
  )

  const posts = nodes.filter(
    ({ category }) =>
      selectedCategory === 'All' || category?.includes(selectedCategory),
  )

  const handleSelectCategory = (category: string) =>
    setSelectedCategory(category)

  return (
    <>
      <Introduction />
      <Category
        categories={categories}
        selectedCategory={selectedCategory}
        handleSelect={handleSelectCategory}
      />
      <Postlist>
        {posts.map(({ title, slug, date }) => (
          <Postbox key={slug}>
            <Titlebox>{title}</Titlebox>
            <Datebox>{date}</Datebox>
          </Postbox>
        ))}
      </Postlist>
    </>
  )
}

export const query = graphql`
  query IndexPage {
    allContentfulPost(sort: { date: DESC }) {
      nodes {
        title
        category
        slug
        date
      }
    }
  }
`
