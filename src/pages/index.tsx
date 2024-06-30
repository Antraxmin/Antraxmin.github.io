import { PageProps, graphql } from 'gatsby'
import Layout from '../components/common/Layout'
import React from 'react'

interface IndexPageQuery {
  allContentfulPost: {
    nodes: {
      title: string
      slug: string
      date: string
    }[]
  }
}

export default function Index({
  data: {
    allContentfulPost: { nodes },
  },
}: PageProps<IndexPageQuery>) {
  return (
    <Layout>
      {nodes.map(({ title, slug, date }) => (
        <div key={slug}>
          {title} / {date} / {slug}
        </div>
      ))}
    </Layout>
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
