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

#### 2.1 Create a Data Volume

Create a Docker volume to persist your node’s data:

```bash
docker volume create epress-data
```

#### 2.2 Initial Setup and Configuration (Interactive Wizard)

Run an initial setup to configure your node, including database settings and node address, using a one-time container:

```bash
docker run -it --rm -v epress-data:/app/data ghcr.io/epressworld/epress:latest install
```

- `-it`: Enables interactive mode for the setup wizard.
- `--rm`: Automatically deletes the container after exiting.
- `-v epress-data:/app/data`: Mounts the `epress-data` volume to the container’s `/app/data` directory for persistent storage.
- `install`: Triggers the interactive setup wizard.

**The wizard will prompt you for the following**:

- **`EPRESS_AUTH_JWT_SECRET`**: A key for encrypting user authentication tokens. Press Enter to use a secure, auto-generated key.
- **`EPRESS_NODE_ADDRESS`**: Your node’s Ethereum address, serving as its unique network identity (must start with `0x`).
- **`EPRESS_NODE_URL`**: The public URL for accessing your node (must start with `http://` or `https://`).
- **`EPRESS_MAIL_TRANSPORT`**: Configuration for email services; leave blank to disable email functionality.

**Configuration Notes**:

- All settings are saved in the `epress-data` volume for persistence.
- You can predefine settings via environment variables, e.g.:
  ```bash
  docker run -it --rm -v epress-data:/app/data -e EPRESS_NODE_ADDRESS=0x... ghcr.io/epressworld/epress:latest install
  ```

#### 2.3 Start the epress Node

Once configured, start your node:

```bash
docker run -d -p 8543:8543 -p 8544:8544 -v epress-data:/app/data --name my-epress-node ghcr.io/epressworld/epress:latest
```

- `-d`: Runs the container in the background.
- `-p 8543:8543 -p 8544:8544`: Maps container ports to host ports.
- `-v epress-data:/app/data`: Mounts the data volume for persistent configuration.
- `--name my-epress-node`: Names the container for easy management.

After starting, access your node via a browser at `http://localhost:8543` (or the configured client port).

### 3. Method 2: Custom-Built Image

For advanced users needing custom configurations (e.g., separating frontend and backend), clone the code, modify settings, and build a custom Docker image.

#### 3.1 Clone the epress Repository

Clone the project code:

```bash
git clone https://github.com/epressworld/epress.git
cd epress
```

#### 3.2 Configure the .env File

Create or edit the `.env` file in the project root. See `env.example` for a complete list of environment variables and their descriptions. Example configuration:

```bash
EPRESS_AUTH_JWT_SECRET=your_jwt_secret
EPRESS_NODE_ADDRESS=0xYourNodeAddress
EPRESS_NODE_URL=http://your-node-url
EPRESS_API_URL=http://your-api-url  # For frontend-backend separation
EPRESS_MAIL_TRANSPORT=your_mail_transport_config
```

- `EPRESS_API_URL`: Set to the API server’s address (e.g., `http://localhost:8544`) for frontend-backend separation.
- Other settings align with the interactive wizard (see Method 1).

#### 3.3 Build the Docker Image

Build your custom `epress` image:

```bash
docker build -t my-epress-custom:latest .
```

- `-t my-epress-custom:latest`: Specifies the image name and tag.
- `.`: Points to the Dockerfile in the current directory.

#### 3.4 Initial Setup and Configuration

Similar to Method 1, create a data volume and run the setup wizard:

```bash
docker volume create epress-data
docker run -it --rm -v epress-data:/app/data my-epress-custom:latest install
```

If the `.env` file already contains settings, the wizard will skip those prompts.

#### 3.5 Start the epress Node (Frontend-Backend Separation)

**Full-Stack Mode** (default, includes both frontend and API server):

```bash
docker run -d -p 8543:8543 -p 8544:8544 -v epress-data:/app/data --name my-epress-node my-epress-custom:latest
```

**API Server Only**:

```bash
docker run -d -p 8544:8544 -v epress-data:/app/data --name my-epress-api my-epress-custom:latest start server
```

**Frontend Only**:

```bash
docker run -d -p 8543:8543 -v epress-data:/app/data --name my-epress-client my-epress-custom:latest start client
```

- `start server`: Runs only the API server (port 8544).
- `start client`: Runs only the frontend application (port 8543).
- Ensure `EPRESS_API_URL` is set to the API server’s address.

### 4. Managing an epress Node (Docker)

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

### 5. Troubleshooting (Docker)

Check container logs for diagnostic information:

```bash
docker logs my-epress-node
```

---

## Running an epress Node from Source

This section is for developers or users who prefer running `epress` from source without Docker.

### 1. Prerequisites

Ensure the following software is installed:

- **Git**: For cloning the repository.
- **Node.js**: Version 20.x or higher (download from [Node.js official site](https://nodejs.org/)).
- **npm**: Typically included with Node.js.

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

### 4. Initial Setup and Configuration (Interactive Wizard)

Run the interactive setup script:

```bash
node commands/install.mjs
```

**Wizard Prompts** (same as Docker setup):

- **`EPRESS_AUTH_JWT_SECRET`**: Authentication key; use the auto-generated option for security.
- **`EPRESS_NODE_ADDRESS`**: Ethereum address (starts with `0x`).
- **`EPRESS_NODE_URL`**: Public URL (starts with `http://` or `https://`).
- **`EPRESS_MAIL_TRANSPORT`**: Email service configuration; leave blank to disable.

**Configuration Notes**:

- Running `node commands/install.mjs` will create and populate the `.env` file in the project root, which also initializes the database.
- You can then further customize settings by editing the `.env` file. See `env.example` for all available environment variables and their descriptions.

### 5. Build the Project

Before starting the node, build the project to generate necessary files:

```bash
npm run build
```

### 6. Start the epress Node

Launch the node:

```bash
npm run start
```

Once running, access the node via a browser at `http://localhost:8543` (or the configured client port).

### 7. Managing an epress Node (Source)

- **Stop the Node**: Press `Ctrl + C` in the terminal.
- **Update Configuration**: Edit the `.env` file, then rerun `npm run build` and `npm run start`.
- **Reconfigure**: Delete the `.env` file and run:
  ```bash
  node commands/install.mjs
  ```
  Or force reconfiguration:
  ```bash
  node commands/install.mjs --force
  ```

### 8. Troubleshooting (Source)

Check the terminal output for logs to diagnose issues.

---

## When to Use a Custom Build?

- **Official Image**: Best for quick deployments or when no customization is needed, avoiding the build process.
- **Custom Build**: Recommended for:
  - Separating frontend and backend (set `EPRESS_API_URL` and run `start client` or `start server`).
  - Modifying source code or adding custom features.
  - Requiring specific environment variables or configurations.