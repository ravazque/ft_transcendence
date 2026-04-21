c3r14s2% cd 42/TranscendYoga 
c3r14s2% make
═══ Checking system dependencies ═══
OS: ubuntu (apt)
All dependencies present
Your user is not in the 'docker' group.
Run the following then LOG OUT and back in:
  sudo usermod -aG docker ravazque
Docker daemon running
═══ System ready ═══
Host UID/GID set to 101545:4224 in .env
Directus bind-mount directories ready
Building images...
docker compose -f srcs/docker-compose.yml --project-directory srcs build
[+] Building 1456.2s (25/25) FINISHED                                           
 => [internal] load local bake definitions                                 0.0s
 => => reading from stdin 1.04kB                                           0.0s
 => [fullstack internal] load build definition from Dockerfile             1.1s
 => => transferring dockerfile: 1.13kB                                     0.0s
 => [nginx internal] load build definition from Dockerfile                 1.0s
 => => transferring dockerfile: 1.61kB                                     0.2s
 => [nginx internal] load metadata for docker.io/owasp/modsecurity-crs:4-  2.9s
 => [fullstack internal] load metadata for docker.io/library/node:22-book  2.5s
 => [fullstack internal] load .dockerignore                                0.7s
 => => transferring context: 66B                                           0.0s
 => [nginx internal] load .dockerignore                                    0.8s
 => => transferring context: 2B                                            0.0s
 => [fullstack 1/8] FROM docker.io/library/node:22-bookworm-slim@sha256:  15.1s
 => => resolve docker.io/library/node:22-bookworm-slim@sha256:f3a68cf41a8  0.9s
 => => sha256:f3a68cf41a855d227d1b0ab832bed9749469ef38cf4 6.49kB / 6.49kB  0.0s
 => => sha256:db9a3a15e8e8e2adbaf1e1c3d93dfb04c2e294bdd02 1.93kB / 1.93kB  0.0s
 => => sha256:aa6c5d88264b692b5bbe43cf0785a4b2c4acdded40d 6.88kB / 6.88kB  0.0s
 => => sha256:da539b6761059a0a114c6671f1267b57445e3a54d 28.24MB / 28.24MB  1.1s
 => => sha256:33df803327efdb324f39cb968d9bde54bde32290f 49.84MB / 49.84MB  2.4s
 => => sha256:6834908f25fc5bafe15da60286dd49adb9785e948ca 3.31kB / 3.31kB  1.2s
 => => extracting sha256:da539b6761059a0a114c6671f1267b57445e3a54da023db5  0.6s
 => => sha256:6de4ed957c21055b42a476494f8062b97fa44bd0072 1.71MB / 1.71MB  1.8s
 => => sha256:7c35fcf84091b28e8dcfef198757c1b89e2aa9dd1fcb082 447B / 447B  2.4s
 => => extracting sha256:6834908f25fc5bafe15da60286dd49adb9785e948ca44442  0.0s
 => => extracting sha256:33df803327efdb324f39cb968d9bde54bde32290f8cb3bf3  1.0s
 => => extracting sha256:6de4ed957c21055b42a476494f8062b97fa44bd00727834c  0.3s
 => => extracting sha256:7c35fcf84091b28e8dcfef198757c1b89e2aa9dd1fcb0820  0.0s
 => [fullstack internal] load build context                                1.3s
 => => transferring context: 20.45kB                                       0.0s
 => [nginx 1/4] FROM docker.io/owasp/modsecurity-crs:4-nginx-20260225070  47.5s
 => => resolve docker.io/owasp/modsecurity-crs:4-nginx-202602250702@sha25  1.5s
 => => sha256:c88099f4efc0d85ad09913bf6de25f98f02ad263143 2.36kB / 2.36kB  0.0s
 => => sha256:b243df371398b1eeb5bc764d7b8f9e2e13927b842ed 5.21kB / 5.21kB  0.0s
 => => sha256:a2de9f8232f84a344a87159d62475fee9408e255f 25.39kB / 25.39kB  0.0s
 => => sha256:0c8d55a45c0dc58de60579b9cc5b708de9e7957f4 29.78MB / 29.78MB  2.5s
 => => sha256:c766857347f13a4f52f2bdf5972830c44c5e3b681 30.02MB / 30.02MB  3.1s
 => => sha256:75c82054603f59443337b007df93eacee3637a46146 4.18kB / 4.18kB  2.2s
 => => sha256:7f778aea2629ea6d203cc0c7cdadd437bd24d241ea3cb9d 629B / 629B  3.0s
 => => extracting sha256:0c8d55a45c0dc58de60579b9cc5b708de9e7957f4591fc7d  0.7s
 => => sha256:2a7e41b60d4811aef78fbb54d9705e96aae37ac261b4679 960B / 960B  3.4s
 => => sha256:57c6afec2da2f8481e473f25d4acb47565044f09e09ed0b 406B / 406B  3.5s
 => => sha256:f253bf43cef0e69ec4dd5fb8e1f5e56b668afaf909b 1.21kB / 1.21kB  3.8s
 => => sha256:ebdaebf1ed6bf991057277cf6dbf528f9e683f648c4 1.40kB / 1.40kB  3.8s
 => => sha256:ec1b89a9450db741add9d2911f3ddb4afcd6079 784.67kB / 784.67kB  4.2s
 => => extracting sha256:c766857347f13a4f52f2bdf5972830c44c5e3b6814361728  0.4s
 => => sha256:bdfb139347b77eca88535e89b8eb5b069aceb9624 47.78kB / 47.78kB  4.7s
 => => sha256:dd0999a422fc7cb1f3ebe0305defe8ede6624e214 17.83kB / 17.83kB  4.8s
 => => sha256:c9e7b8bfa75815801a7841403c78cf3a2143ac576349e4f 837B / 837B  5.3s
 => => sha256:7454b6fdb263ec27742ca5c8a3b4e2921c8125d24b4 4.75kB / 4.75kB  5.7s
 => => extracting sha256:75c82054603f59443337b007df93eacee3637a461464b8a0  0.0s
 => => sha256:4baa9a9653145e56bf813362dba048b7f379ec7 256.16kB / 256.16kB  6.0s
 => => sha256:9bf513addd2ec86c96e3510fe3621f792db192d9f4c 1.55kB / 1.55kB  6.2s
 => => extracting sha256:7f778aea2629ea6d203cc0c7cdadd437bd24d241ea3cb9de  0.0s
 => => sha256:a0affb5206c2856081080daf44d4337280c1643f01bce13 290B / 290B  6.8s
 => => sha256:f409abd1619eda82b756928367a5bd15a1353b50151039f 497B / 497B  6.9s
 => => sha256:cb4def8a01bb008efabaaf04dc97b7a0fb904666611 1.30kB / 1.30kB  7.4s
 => => extracting sha256:2a7e41b60d4811aef78fbb54d9705e96aae37ac261b46793  0.0s
 => => sha256:ac6cbc63c1ca8714b7a6e57dc1a3525d400b98b804bc4f6 703B / 703B  8.4s
 => => sha256:72278b7d1c0f40e22ce8735f4a10b9e998e7d0b1f21 2.18kB / 2.18kB  8.2s
 => => extracting sha256:57c6afec2da2f8481e473f25d4acb47565044f09e09ed0b2  0.0s
 => => sha256:318a8e6f15177afc7684faebfdc2cd4b27a2e1d0541 1.03kB / 1.03kB  8.5s
 => => extracting sha256:f253bf43cef0e69ec4dd5fb8e1f5e56b668afaf909b5dce7  0.0s
 => => sha256:b735d1b2c5c6c64139a8dc92a1200863ceb477e6 33.43MB / 33.43MB  10.9s
 => => sha256:b0a4e441756932b78d86e38fa8a77e18e60c577b86a 2.12kB / 2.12kB  9.4s
 => => sha256:795343616a37d869e882b61570d3d0abebbdcc3158 1.37kB / 1.37kB  10.0s
 => => extracting sha256:ebdaebf1ed6bf991057277cf6dbf528f9e683f648c4e2afd  0.0s
 => => sha256:f14062bdde422a97209b24bf714e6ccf0ef2cbd744911f 233B / 233B  10.7s
 => => sha256:470cd89d2fcffb1578e79d3a2996e74ff52150f527a084 177B / 177B  11.2s
 => => extracting sha256:ec1b89a9450db741add9d2911f3ddb4afcd6079a706ec690  0.3s
 => => extracting sha256:dd0999a422fc7cb1f3ebe0305defe8ede6624e21461c9651  0.0s
 => => extracting sha256:bdfb139347b77eca88535e89b8eb5b069aceb962420c0756  0.0s
 => => extracting sha256:c9e7b8bfa75815801a7841403c78cf3a2143ac576349e4f5  0.0s
 => => extracting sha256:7454b6fdb263ec27742ca5c8a3b4e2921c8125d24b4b3f6e  0.0s
 => => extracting sha256:4baa9a9653145e56bf813362dba048b7f379ec7b7b19025e  0.8s
 => => extracting sha256:9bf513addd2ec86c96e3510fe3621f792db192d9f4cb62f3  0.0s
 => => extracting sha256:a0affb5206c2856081080daf44d4337280c1643f01bce13c  0.0s
 => => extracting sha256:f409abd1619eda82b756928367a5bd15a1353b50151039ff  0.0s
 => => extracting sha256:cb4def8a01bb008efabaaf04dc97b7a0fb904666611b5a2f  0.0s
 => => extracting sha256:ac6cbc63c1ca8714b7a6e57dc1a3525d400b98b804bc4f6f  0.0s
 => => extracting sha256:72278b7d1c0f40e22ce8735f4a10b9e998e7d0b1f21b1865  0.0s
 => => extracting sha256:318a8e6f15177afc7684faebfdc2cd4b27a2e1d054154d4f  0.0s
 => => extracting sha256:b0a4e441756932b78d86e38fa8a77e18e60c577b86a1fb67  0.0s
 => => extracting sha256:795343616a37d869e882b61570d3d0abebbdcc3158111967  0.0s
 => => extracting sha256:b735d1b2c5c6c64139a8dc92a1200863ceb477e644a84cfd  1.2s
 => => extracting sha256:f14062bdde422a97209b24bf714e6ccf0ef2cbd744911f2b  0.0s
 => => extracting sha256:470cd89d2fcffb1578e79d3a2996e74ff52150f527a084e0  0.0s
 => [nginx internal] load build context                                    0.7s
 => => transferring context: 6.98kB                                        0.0s
 => [fullstack 2/8] RUN apt-get update     && apt-get install -y --no-in  86.6s
 => [nginx 2/4] RUN chmod u+w /etc/nginx/templates/conf.d/     && rm -f /  5.7s
 => [nginx 3/4] COPY conf.d/ /etc/nginx/conf.d/                            1.4s
 => [nginx 4/4] COPY static/ /usr/share/nginx/html/                        1.2s
 => [nginx] exporting to image                                             2.2s
 => => exporting layers                                                    1.6s
 => => writing image sha256:9b5d0195a2659ce9b974c85d4de46408a540fdbdaccc6  0.1s
 => => naming to docker.io/library/srcs-nginx                              0.2s
 => [nginx] resolving provenance for metadata file                         0.0s
 => [fullstack 3/8] WORKDIR /app                                           0.8s
 => [fullstack 4/8] COPY package.json package-lock.json* ./                0.8s
 => [fullstack 5/8] RUN npm install                                       84.2s
 => [fullstack 6/8] COPY . .                                               0.9s
 => [fullstack 7/8] RUN npx prisma generate                                4.2s
 => [fullstack 8/8] RUN chown -R node:node /app                         1203.5s
 => [fullstack] exporting to image                                        52.2s
 => => exporting layers                                                   51.7s
 => => writing image sha256:1b766d68d6d0644c68e281e05e5cb09c90640668c62bf  0.1s
 => => naming to docker.io/library/srcs-fullstack                          0.1s
 => [fullstack] resolving provenance for metadata file                     0.0s
[+] Building 2/2
 ✔ srcs-fullstack  Built                                                   0.0s 
 ✔ srcs-nginx      Built                                                   0.0s 
Starting yoga...
docker compose -f srcs/docker-compose.yml --project-directory srcs up -d
[+] Running 32/32
 ✔ directus Pulled                                                        38.7s 
 ✔ db Pulled                                                              40.6s 
 ✔ redis Pulled                                                           34.9s 
                                                                                
                                                                                
                                                                                
                                                                                
                                                                                
                                                                                
                                                                                
                                                                                
                                                                                
[+] Running 10/10
 ✔ Network yoga_proxy              Created                                 0.3s 
 ✔ Network yoga_data               Created                                 0.3s 
 ✔ Volume "yoga_redis_data"        Created                                 0.0s 
 ✔ Volume "yoga_directus_uploads"  Cre...                                  0.0s 
 ✔ Volume "yoga_db_data"           Created                                 0.0s 
 ✔ Container yoga_redis            Healthy                                41.7s 
 ✔ Container yoga_db               Healthy                                41.7s 
 ✔ Container yoga_fullstack        Healthy                                60.9s 
 ✔ Container yoga_directus         Healthy                                86.9s 
 ✔ Container yoga_nginx            Started                                67.3s 
Platform running at https://localhost:8443
Directus CMS at https://localhost:8443/cms
c3r14s2%   make down
Stopping yoga...
docker compose -f srcs/docker-compose.yml --project-directory srcs down
[+] Running 7/7
 ✔ Container yoga_nginx      Removed                                       3.4s 
 ✔ Container yoga_directus   Removed                                       1.9s 
 ✔ Container yoga_fullstack  Removed                                      12.0s 
 ✔ Container yoga_db         Removed                                       3.8s 
 ✔ Container yoga_redis      Removed                                       2.5s 
 ✔ Network yoga_data         Removed                                       0.8s 
 ✔ Network yoga_proxy        Removed                                       0.6s 
c3r14s2% make up
Starting yoga...
docker compose -f srcs/docker-compose.yml --project-directory srcs up -d
[+] Running 7/7
 ✔ Network yoga_data         Created                                       0.2s 
 ✔ Network yoga_proxy        Created                                       0.3s 
 ✔ Container yoga_db         Healthy                                      24.8s 
 ✔ Container yoga_redis      Healthy                                      24.3s 
 ✔ Container yoga_fullstack  Healthy                                      33.7s 
 ✔ Container yoga_directus   Healthy                                      37.2s 
 ✔ Container yoga_nginx      Started                                      23.7s 
c3r14s2% docker ps
CONTAINER ID   IMAGE                  COMMAND                  CREATED          STATUS                        PORTS                                                   NAMES
3d51dd5f68e9   srcs-nginx             "/docker-entrypoint.…"   32 seconds ago   Restarting (1) 1 second ago                                                           yoga_nginx
6e195e2b2216   srcs-fullstack         "docker-entrypoint.s…"   47 seconds ago   Up 23 seconds (healthy)       3000/tcp, 0.0.0.0:5555->5555/tcp, [::]:5555->5555/tcp   yoga_fullstack
c9e2a652ac5e   directus/directus:11   "docker-entrypoint.s…"   47 seconds ago   Up 23 seconds (healthy)       8055/tcp                                                yoga_directus
f73e1576fc68   redis:7.4-bookworm     "docker-entrypoint.s…"   49 seconds ago   Up 30 seconds (healthy)                                                               yoga_redis
ba652dd8852a   postgres:17-bookworm   "docker-entrypoint.s…"   49 seconds ago   Up 30 seconds (healthy)                                                               yoga_db
c3r14s2% docker ps -a | grep -E 'Exit|unhealthy' 
c3r14s2% make logs-nginx 2>&1 | tail -50
^C^C
c3r14s2% make logs-app 2>&1 | tail -80
^C^C
