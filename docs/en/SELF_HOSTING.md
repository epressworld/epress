# Running an epress Node

This guide will help you deploy and run an `epress` node, whether using Docker or running directly from source. Depending on your needs, you can choose one of the following methods:

1. **Deploy with Docker**: Ideal for users who want a quick setup or production-ready deployment.
2. **Run from Source**: Suited for developers or those needing to customize the code.

---

## Deploying an epress Node with Docker

This section explains how to run an `epress` node using Docker. You can choose one of two approaches:

- **Using the Official Pre-built Image** (Recommended): Pull the pre-built image from `ghcr.io/epressworld/epress` for a hassle-free setup.
- **Custom-Built Image**: Suitable for users needing specific configurations, such as separating frontend and backend.

### 1. Prerequisites

Before starting, ensure the following software is installed:

- **Git**: Required for cloning the `epress` repository (only for custom builds).
- **Docker Desktop** (macOS/Windows) or **Docker Engine** (Linux): Necessary for running Docker containers. Ensure the Docker service is active.

### 2. Method 1: Using the Official Pre-built Image

For a quick setup without custom configurations, use the official pre-built image `ghcr.io/epressworld/epress:latest` to skip the build process.

#### 2.1 Start Your Node

Start your node using the following command. Docker will automatically create the `epress-data` volume on the first run if it doesn’t exist.

```bash
docker run -d -p 8543:8543 -p 8544:8544 -v epress-data:/app/data --name my-epress-node --restart=always ghcr.io/epressworld/epress:latest
```

- `-d`: Runs the container in the background.
- `-p 8543:8543` (frontend) and `-p 8544:8544` (backend): Maps the necessary container ports to your host.
- `-v epress-data:/app/data`: Mounts the `epress-data` volume to persist your node’s database and configuration.
- `--name my-epress-node`: Assigns a convenient name to your container.
- `--restart=always`: Ensures the node automatically restarts if it goes down.

#### 2.2 Complete Setup via Web Interface

Once the container is running, open your browser and navigate to `http://localhost:8543`.

You will be automatically redirected to the web-based installation wizard. This user-friendly interface will guide you through configuring your node. The settings you configure here, such as your node’s address, title, and mail server settings, will be stored in the database within the `epress-data` volume.

### 3. Method 2: Custom-Built Image

For advanced users needing custom configurations (e.g., separating frontend and backend), clone the code, modify settings, and build a custom Docker image.

#### 3.1 Clone the epress Repository

Clone the project code:

```bash
git clone https://github.com/epressworld/epress.git
cd epress
```

#### 3.2 Modify the Existing .env File (Optional)

The repository includes a `.env` file with default infrastructure settings. If you need to preset specific configurations for your custom image (e.g., specifying `EPRESS_API_URL` for backend separation), you can directly **modify** this existing file. Your changes will be bundled into the image during the build process.

**Example: Modifying .env for a separated backend**
```
# .env
EPRESS_API_URL=http://localhost:8544
```

Application-level settings (like Node Address, Title, etc.) are still recommended to be configured through the subsequent web installation wizard.

#### 3.3 Build the Docker Image

Build your custom `epress` image:

```bash
docker build -t my-epress-custom:latest .
```

- `-t my-epress-custom:latest`: Specifies the image name and tag.
- `.`: Points to the Dockerfile in the current directory.

#### 3.4 Start Your Node and Configure via Web

1.  **Start your custom container**:
    ```bash
    docker run -d -p 8543:8543 -p 8544:8544 -v epress-data:/app/data --env-file .env --name my-epress-node my-epress-custom:latest
    ```
    - `--env-file .env`: Passes your custom infrastructure variables to the container.

2.  **Complete Setup**:
    Open `http://localhost:8543` in your browser to access the web-based installation wizard.

---

## Running an epress Node from Source

This section is for developers or users who prefer running `epress` from source without Docker.

### 1. Prerequisites

Ensure the following software is installed:

- **Git**: For cloning the repository.
- **Node.js**: Version 20.x or higher (download from [Node.js official site](https://nodejs.org/)).
- **npm**: Typically included with Node.js.
- **PM2**: Process manager for production deployments (install globally with `npm install -g pm2`).

### 2. Clone the epress Repository

Clone the project code:

```bash
git clone https://github.com/epressworld/epress.git
cd epress
```

### 3. Install Project Dependencies

Install required Node.js dependencies:

```bash
npm install
```

### 4. Development Mode

For development with hot-reload:

```bash
npm run dev
```

This starts both the server and client in parallel with colored output:
- Server (blue): Fastify server on port 8544
- Client (green): Next.js development server on port 8543

### 5. Production Mode

For production deployment:

```bash
npm run build
npm run start
```

This uses PM2 to manage both the server and client processes. PM2 provides:
- Automatic restart on crashes
- Log management
- Process monitoring

**PM2 Commands**:
- `npm run stop` - Stop all processes
- `npm run restart` - Restart all processes
- `npm run logs` - View process logs
- `pm2 list` - List all running processes
- `pm2 monit` - Real-time monitoring

### 6. Standalone Server/Client

You can also run the server and client separately:

**Server only**:
```bash
npm run start:server
```

**Client only**:
```bash
npm run start:client
```

### 7. Complete Setup via Web Interface

Once the server is running, open your browser and navigate to `http://localhost:8543`.

You will be automatically redirected to the web-based installation wizard. This interface will guide you through configuring your node’s application settings (Node Address, Profile, Mail Server, etc.). These settings will be saved to the database.

### 8. Customizing Infrastructure Configuration (Optional)

The project includes a default `.env` file with standard infrastructure settings. If you need to override these settings (e.g., to change server ports or the database file path), create a new file named `.env.local` in the project root.

Any variables you define in `.env.local` will take precedence over the ones in `.env`.

**Example `.env.local`**:
```
# .env.local
# Change the default client and server ports
EPRESS_CLIENT_PORT=8080
EPRESS_SERVER_PORT=8081
```

### 9. Using a Different Database (e.g., PostgreSQL)

By default, epress uses SQLite for easy setup. For production environments, you can switch to a more robust database like PostgreSQL or MySQL.

1.  **Install the Database Driver**:
    Install the required driver for your chosen database. For example, for PostgreSQL:
    ```bash
    npm install pg
    ```

2.  **Configure Environment Variables**:
    Create or edit your `.env.local` file to set the database client and connection string.

    **Example for PostgreSQL**:
    ```
    # .env.local
    EPRESS_DATABASE_CLIENT=pg
    EPRESS_DATABASE_CONNECTION=postgres://user:password@host:port/database
    ```

    - `EPRESS_DATABASE_CLIENT`: Set this to the knex client for your database (`pg` for PostgreSQL, `mysql` for MySQL, etc.).
    - `EPRESS_DATABASE_CONNECTION`: The connection string for your database.

---

## Reverse Proxy Mode (Caddy/Nginx)

For production deployments with large file uploads, you can use an external reverse proxy (Caddy or Nginx) instead of Next.js’s built-in rewrites. This eliminates the double memory overhead for file uploads.

### 1. Enable Reverse Proxy Mode

Set the environment variable:
```
EPRESS_REVERSE_PROXY=true
```

### 2. Configure Your Reverse Proxy

**Caddy Example** (`Caddyfile`):
```
yourdomain.com {
    reverse_proxy /api/* localhost:8544
    reverse_proxy /ewp/* localhost:8544
    reverse_proxy /* localhost:8543
}
```

**Nginx Example**:
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location /api/ {
        proxy_pass http://localhost:8544;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /ewp/ {
        proxy_pass http://localhost:8544;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        proxy_pass http://localhost:8543;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## Frontend-Backend Separation

For advanced deployments, you can run the frontend and backend on separate servers.

### 1. Backend Server

On your backend server:
```bash
# .env
EPRESS_SERVER_PORT=8544

npm run start:server
```

### 2. Frontend Server

On your frontend server:
```bash
# .env
EPRESS_API_URL=http://your-backend-server:8544
EPRESS_CLIENT_PORT=8543

npm run start:client
```

The frontend will connect to the backend API via `EPRESS_API_URL`.

---

## Managing and Upgrading Your Node (Docker)

### Managing Your Node

Common Docker commands:

- **Check Node Status**:
  ```bash
  docker ps
  ```
- **View Node Logs**:
  ```bash
  docker logs -f my-epress-node
  ```
- **Stop the Node**:
  ```bash
  docker stop my-epress-node
  ```
- **Start a Stopped Node**:
  ```bash
  docker start my-epress-node
  ```
- **Restart the Node**:
  ```bash
  docker restart my-epress-node
  ```
- **Delete the Container (Preserves Data Volume)**:
  ```bash
  docker rm my-epress-node
  ```
- **Delete the Data Volume (Caution: Deletes All Node Data)**:
  ```bash
  docker volume rm epress-data
  ```
- **Access the Container (Advanced Users)**:
  ```bash
  docker exec -it my-epress-node sh
  ```

### Upgrading Your Node

**It is strongly recommended to back up your data volume before upgrading.**

1.  **Pull the Latest Image**:
    Pull the latest version of the epress image from Docker Hub.
    ```bash
    docker pull ghcr.io/epressworld/epress:latest
    ```

2.  **Stop and Remove the Current Container**:
    Find your running container’s name or ID and then stop and remove it. This action will not affect your data stored in the `epress-data` volume.
    ```bash
    docker stop my-epress-node
    docker rm my-epress-node
    ```

3.  **Restart Your Node with the New Image**:
    Start a new container using the same `docker run` command from the initial setup. Docker will automatically attach the existing `epress-data` volume to the new container.
    ```bash
    docker run -d -p 8543:8543 -p 8544:8544 -v epress-data:/app/data --name my-epress-node --restart=always ghcr.io/epressworld/epress:latest
    ```

4.  **Run Database Migrations (If Required)**:
    After the new container is running, execute the database migration command to apply any schema updates.
    ```bash
    docker exec my-epress-node npm run migrate
    ```

Your node is now upgraded and running the latest version.

### Upgrading from Source

To upgrade your node when running from source, follow these steps:

1.  **Stop your server**:
    ```bash
    npm run stop
    ```
2.  **Get the latest code**:
    ```bash
    git pull
    ```
3.  **Install/Update dependencies**:
    ```bash
    npm install
    ```
4.  **Run database migrations**:
    ```bash
    npm run migrate
    ```
5.  **Build and restart the server**:
    ```bash
    npm run build
    npm run start
    ```

### Troubleshooting

**Docker**: Check container logs for diagnostic information:
```bash
docker logs my-epress-node
```

**Source/PM2**: View PM2 logs:
```bash
npm run logs
# or
pm2 logs
```

---

## When to Use a Custom Build?

- **Official Image**: Best for quick deployments or when no customization is needed, avoiding the build process.
- **Custom Build**: Recommended for:
  - Separating frontend and backend (set `EPRESS_API_URL` and run `start:server` or `start:client`).
  - Using an external reverse proxy (set `EPRESS_REVERSE_PROXY=true`).
  - Modifying source code or adding custom features.
  - Requiring specific environment variables or configurations.
