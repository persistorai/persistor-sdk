# @persistorai/sdk

TypeScript SDK for the [Persistor](https://github.com/persistorai/persistor) knowledge graph API.

## Installation

```bash
npm install @persistorai/sdk
```

## Quick Start

```typescript
import { PersistorClient } from '@persistorai/sdk';

const client = new PersistorClient({
  url: 'http://localhost:3030',
  apiKey: 'your-api-key',
});

// Create a node
const node = await client.createNode({
  type: 'person',
  label: 'Alice',
  properties: { role: 'engineer' },
});

// Search
const results = await client.search({ q: 'Alice', limit: 10 });

// Get graph context
const context = await client.getContext(node.id);
```

## Security

By default, the client only allows localhost URLs to prevent credential leakage. To connect to a remote server:

```typescript
const client = new PersistorClient({
  url: 'https://persistor.example.com',
  apiKey: 'your-api-key',
  allowRemote: true,
});
```

## Error Handling

```typescript
import { NotFoundError, AuthenticationError, ValidationError } from '@persistorai/sdk';

try {
  await client.getNode('nonexistent');
} catch (err) {
  if (err instanceof NotFoundError) {
    console.log('Node not found');
  }
}
```

## API Coverage

- **Health:** `health()`, `ready()`
- **Nodes:** `listNodes()`, `createNode()`, `getNode()`, `updateNode()`, `patchNodeProperties()`, `deleteNode()`, `getNodeHistory()`
- **Edges:** `listEdges()`, `createEdge()`, `updateEdge()`, `patchEdgeProperties()`, `deleteEdge()`
- **Search:** `search()`, `searchSemantic()`, `searchHybrid()`
- **Graph:** `getNeighbors()`, `traverse()`, `getContext()`, `getPath()`
- **Bulk:** `bulkCreateNodes()`, `bulkCreateEdges()`
- **Salience:** `boostSalience()`, `supersede()`, `recalcSalience()`
- **Admin:** `getStats()`, `backfillEmbeddings()`
- **Audit:** `queryAudit()`, `purgeAudit()`

## License

Apache-2.0
