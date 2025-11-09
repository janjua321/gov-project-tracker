# ⚙️ Project Setup: Government Blockchain Tracker

This guide walks you through installing everything for local development using WSL2 and Ubuntu.

---

## 🧰 Prerequisites

- WSL2 with Ubuntu 20.04 or 22.04
- Git
- Docker & Docker Compose
- Node.js v18 or 20
- Go (v1.20+)
- Python 3.8+
- VS Code + Remote WSL extension (optional)

---

INSTALL DOCKER
-------
What gpt says to do ----
sudo apt update
sudo apt install docker.io docker-compose -y
sudo usermod -aG docker $USER
newgrp docker


what i did and would suggest----
install docker for windows from website and enable wsl integration during install and from settings then check from wsl ----
docker --v

INSTALL GO
---------
wget https://go.dev/dl/go1.20.13.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.20.13.linux-amd64.tar.gz
echo "export PATH=$PATH:/usr/local/go/bin" >> ~/.bashrc
source ~/.bashrc

----(ALSO SET UP ENVIORNMENT IN LINUX FOR GO)