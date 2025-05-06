# OpenG2P UCA UI

## How to run

- Run:
  ```sh
  docker build . -t openg2p-uca-ui && docker run --name uca-ui --rm -it -e API_PATH_PREFIX=/v1/uca -p 3001:8000 openg2p-uca-ui
  ```
- Access the UI on http://localhost:3000/chat.

### TODO
Give Setup instructions


## Licenses

This repository is licensed under [MPL-2.0](LICENSE).
