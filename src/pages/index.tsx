import { PageProps, graphql } from 'gatsby'
import React from 'react'
import Layout from '../components/common/Layout'
import Introduction from '../components/main/Introduction'

export default function Index({
  data: {
    allContentfulPost: { nodes },
  },
}: PageProps<Queries.IndexPageQuery>) {
  return (
    <>
      <Introduction />
      {nodes.map(({ title, slug, date }) => (
        <div key={slug}>
          {title} / {date} / {slug}
        </div>
      ))}
    </>
  )
}

export const query = graphql`
  query IndexPage {
    allContentfulPost(sort: { date: DESC }) {
      nodes {
        title
        slug
        date
      }
    }
  }
`
