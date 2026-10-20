<h1 align="center">
  <sup>@se-oss/swr</sup>
  <br>
  <a href="https://github.com/shahradelahi/ts-swr/actions/workflows/ci.yml"><img src="https://github.com/shahradelahi/ts-swr/actions/workflows/ci.yml/badge.svg?branch=main&event=push" alt="CI"></a>
  <a href="https://www.npmjs.com/package/@se-oss/swr"><img src="https://img.shields.io/npm/v/@se-oss/swr.svg" alt="NPM Version"></a>
  <a href="/LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat" alt="MIT License"></a>
  <a href="https://bundlephobia.com/package/@se-oss/swr"><img src="https://img.shields.io/bundlephobia/minzip/@se-oss/swr" alt="npm bundle size"></a>
  <a href="https://packagephobia.com/result?p=@se-oss/swr"><img src="https://packagephobia.com/badge?p=@se-oss/swr" alt="Install Size"></a>
</h1>

_@se-oss/swr_ is a robust, runtime-agnostic Stale-While-Revalidate data-fetching and synchronization engine for TypeScript and JavaScript.

## Benefits

- **Active Synchronization:** Serves cached data instantly while transparently revalidating in the background.
- **In-Flight Request Deduplication:** Prevents duplicate concurrent fetches for the same key.
- **Pluggable Storage Adapters:** Easily decouple storage (Memory, LRU, Redis, SQLite) using the simple `SWRStoreAdapter` interface.
- **Pub/Sub Subscriptions & Events:** Subscribe to key-level updates or listen to global revalidation and error events.
- **Error Resilience & Retries:** Configure automatic background retries with custom backoff strategies.
- **Universal Runtime Support:** Works seamlessly across Node.js, Edge environments, and Browsers.

---

- [Benefits](#benefits)
- [Installation](#-installation)
- [Usage](#-usage)
- [Documentation](#-documentation)
- [Contributing](#-contributing)
- [License](#license)

## 📦 Installation

```bash
npm install @se-oss/swr
```

<details>
<summary>Install using your favorite package manager</summary>

**pnpm**

```bash
pnpm install @se-oss/swr
```

**yarn**

```bash
yarn add @se-oss/swr
```

</details>

## 📖 Usage

### Basic Usage

```typescript
import { SWR } from '@se-oss/swr';

const swr = new SWR({
  staleTimeMs: 10000, // 10 seconds before considered stale
});

async function getUser(id: string) {
  return swr.resolve(`user:${id}`, async () => {
    const res = await fetch(`https://api.example.com/users/${id}`);
    return res.json();
  });
}
```

### Subscriptions & Mutations

```typescript
import { SWR } from '@se-oss/swr';

const swr = new SWR();

// Subscribe to updates for a key
const unsubscribe = swr.subscribe('user:1', (user) => {
  console.log('User updated:', user);
});

// Mutate cache manually
await swr.mutate('user:1', { id: 1, name: 'Alice' });
```

### Global Events & Resiliency

```typescript
import { SWR } from '@se-oss/swr';

const swr = new SWR({
  retries: 3,
  retryBackoff: (attempt) => Math.pow(2, attempt) * 1000,
});

swr.on('revalidate', ({ key, data }) => {
  console.log(`Revalidated ${key}:`, data);
});

swr.on('error', ({ key, error }) => {
  console.error(`Error on ${key}:`, error);
});
```

## 📚 Documentation

For all configuration options, please see [the API docs](https://www.jsdocs.io/package/@se-oss/swr).

## 🤝 Contributing

Want to contribute? Awesome! Star the project or raise issues on [GitHub](https://github.com/shahradelahi/ts-swr).

Thanks again for your support! 🙏

## License

[MIT](/LICENSE) © [Shahrad Elahi](https://github.com/shahradelahi) and [contributors](https://github.com/shahradelahi/ts-swr/graphs/contributors).
