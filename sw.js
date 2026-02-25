const CACHE_NAME = 'attendance-v3';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './manifest.json',
    './icon-192.svg'
];

// サービスワーカーのインストール時にキャッシュ
self.addEventListener('install', (event) => {
    self.skipWaiting(); // 即座に新しいSWを有効化
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(ASSETS))
    );
});

// 古いキャッシュを削除
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Old cache deleted:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim(); // 即座に全クライアントを支配下に置く
});

// フェッチ時にネットワークを優先し、だめならキャッシュ（Network First）
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // ネットワークが成功したらキャッシュを更新しつつ返す
                const resClone = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, resClone);
                });
                return response;
            })
            .catch(() => {
                // オフラインならキャッシュから出す
                return caches.match(event.request);
            })
    );
});
