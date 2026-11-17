import { corpus } from './corpus';
import { Bm25Index, chunkDocument } from './bm25';

export const retriever = new Bm25Index(corpus.flatMap(chunkDocument));