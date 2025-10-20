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

#### 2.2 Start Your Node

Start your node using the following command:

```bash
docker run -d -p 8543:8543 -p 8544:8544 -v epress-data:/app/data --name my-epress-node ghcr.io/epressworld/epress:latest
```

- `-d`: Runs the container in the background.
- `-p 8543:8543` (frontend) and `-p 8544:8544` (backend): Maps the necessary container ports to your host.
- `-v epress-data:/app/data`: Mounts the `epress-data` volume to persist your node's database and configuration.
- `--name my-epress-node`: Assigns a convenient name to your container.

#### 2.3 Complete Setup via Web Interface

Once the container is running, open your browser and navigate to `http://localhost:8543`.

You will be automatically redirected to the web-based installation wizard. This user-friendly interface will guide you through configuring your node. The settings you configure here, such as your node's address, title, and mail server settings, will be stored in the database within the `epress-data` volume.

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

1.  **Create a data volume**:
    ```bash
    docker volume create epress-data
    ```

2.  **Start your custom container**:
    ```bash
    docker run -d -p 8543:8543 -p 8544:8544 -v epress-data:/app/data --env-file .env --name my-epress-node my-epress-custom:latest
    ```
    - `--env-file .env`: Passes your custom infrastructure variables to the container.

3.  **Complete Setup**:
    Open `http://localhost:8543` in your browser to access the web-based installation wizard.

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

### 4. Build and Start the Node

Build the project and start the server:

```bash
npm run build
npm run start
```

### 5. Complete Setup via Web Interface

Once the server is running, open your browser and navigate to `http://localhost:8543`.

You will be automatically redirected to the web-based installation wizard. This interface will guide you through configuring your node's application settings (Node Address, Profile, Mail Server, etc.). These settings will be saved to the database.

### 6. Customizing Infrastructure Configuration (Optional)

The project includes a default `.env` file with standard infrastructure settings. If you need to override these settings (e.g., to change server ports or the database file path), create a new file named `.env.local` in the project root.

Any variables you define in `.env.local` will take precedence over the ones in `.env`.

**Example `.env.local`**:
```
# .env.local
# Change the default client and server ports
EPRESS_CLIENT_PORT=8080
EPRESS_SERVER_PORT=8081
```

### 7. Using a Different Database (e.g., PostgreSQL)

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

### 8. Managing an epress Node (Source)

- **Stop the Node**: Press `Ctrl + C` in the terminal.
- **Update Configuration**: Infrastructure settings can be changed in the `.env.local` file (requires a server restart). Application settings can be updated from the settings panel within the epress application itself.

### 9. Troubleshooting (Source)

Check the terminal output for logs to diagnose issues.

---

## When to Use a Custom Build?

- **Official Image**: Best for quick deployments or when no customization is needed, avoiding the build process.
- **Custom Build**: Recommended for:
  - Separating frontend and backend (set `EPRESS_API_URL` and run `start client` or `start server`).
  - Modifying source code or adding custom features.
  - Requiring specific environment variables or configurations.