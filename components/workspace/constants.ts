

export type StrategyCategory = 'rag' | 'sql';

export interface RetrievalStrategyMeta {
    id: string;
    name: string;
    description: string;
    category: StrategyCategory;  // Which chat mode this strategy belongs to
    disabled?: boolean;
}

export const RETRIEVAL_STRATEGIES: RetrievalStrategyMeta[] = [
    { id: 'fusion', name: 'Fusion-Based Search', description: 'Reciprocal Rank Fusion of full-text and semantic search results.', category: 'rag' },
    { id: 'multi-query', name: 'Multi Query RAG', description: 'Generates sub-queries for broader coverage before reranking.', category: 'rag' },
    { id: 'expanded-hybrid', name: 'Expanded Hybrid Rerank', description: 'Hybrid search with query expansion and advanced reranking.', category: 'rag' },
    { id: 'semantic-context', name: 'Semantic Context', description: 'Pure semantic search focusing on vector similarity.', category: 'rag' },
    { id: 'semantic-rerank', name: 'Semantic-Reranker', description: 'Vector retrieval followed by a cross-encoder reranking step.', category: 'rag' },
    { id: 'hybrid-rerank', name: 'Hybrid Rerank', description: 'Standard keyword + vector search with final reranking.', category: 'rag' },
    { id: 'agentic-sql', name: 'Agentic SQL Retrieval', description: 'Autonomous SQL agent for structured database querying.', category: 'sql' }
];

// Helper to get strategies by category
export const getStrategiesByCategory = (category: StrategyCategory): RetrievalStrategyMeta[] => {
    return RETRIEVAL_STRATEGIES.filter(s => s.category === category);
};