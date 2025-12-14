

export interface RetrievalStrategyMeta {
    id: string;
    name: string;
    description: string;
    disabled?: boolean;
}

export const RETRIEVAL_STRATEGIES: RetrievalStrategyMeta[] = [
    { id: 'fusion', name: 'Fusion-Based Search', description: 'Reciprocal Rank Fusion of full-text and semantic search results.' },
    { id: 'multi-query', name: 'Multi Query RAG', description: 'Generates sub-queries for broader coverage before reranking.' },
    { id: 'expanded-hybrid', name: 'Expanded Hybrid Rerank', description: 'Hybrid search with query expansion and advanced reranking.' },
    { id: 'semantic-context', name: 'Semantic Context', description: 'Pure semantic search focusing on vector similarity.' },
    { id: 'semantic-rerank', name: 'Semantic-Reranker', description: 'Vector retrieval followed by a cross-encoder reranking step.' },
    { id: 'hybrid-rerank', name: 'Hybrid Rerank', description: 'Standard keyword + vector search with final reranking.' },
    { id: 'agentic-sql', name: 'Agentic SQL Retrieval', description: 'Autonomous SQL agent for structured database querying.' }
];