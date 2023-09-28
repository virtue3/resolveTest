FROM redis:latest

# setting up a small example LRU redis server for storing sqlite DBs
# low memory here because it's an example.
# defaults to port 6379
CMD ["redis-server", "--maxmemory", "100mb", "--maxmemory-policy", "allkeys-lru"]
