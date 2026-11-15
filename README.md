# Best Cars Dealership

Repository: `fullstack_developer_capstone`

Best Cars Dealership is the application for the IBM Full Stack Application Development Capstone Project. It uses React for the dealer and review pages, Django for user sessions and the car catalog, Express and MongoDB for dealerships and reviews, and a Flask VADER service for sentiment analysis.

People can browse dealerships, filter by state, open a dealer's reviews, register, sign in, and post a review. The Django server keeps the login session and checks form requests with a CSRF token.

## Environment setup

Clone this repository. The Docker Compose environment uses Node 22, Python 3.12, and MongoDB 8.0. With Docker running, start the application from the repository root.

```bash
docker compose up --build -d --wait
```

Open [Best Cars](http://127.0.0.1:8000/). The development volumes keep the MongoDB catalog and Django accounts across `docker compose down` and a later start. Django creates a local signing key on first startup. For the administration interface, run `docker compose exec django python manage.py createsuperuser` and open [Django Admin](http://127.0.0.1:8000/admin/).

| Service | Local URL |
| --- | --- |
| Django | http://127.0.0.1:8000/health |
| Express dealership catalog | http://127.0.0.1:3030/fetchDealers |
| Flask sentiment | http://127.0.0.1:5050/analyze/Fantastic%20services |

## Verify

```bash
docker compose exec -T database env TEST_MONGODB_URI=mongodb://mongo:27017 npm test
docker compose exec -T sentiment python -m unittest -v
```

The catalog test uses an isolated database to verify dealerships, filtering, reviews, and repeat seeding. GitHub Actions runs JavaScript and Python lint checks and automated tests.

## Deploy to the course lab

Build the three application images and push them to the IBM Container Registry namespace assigned by the lab. Replace their image references and the hostname/origin in `deployment.yaml`. Supply `DJANGO_SECRET_KEY` in the namespaced Secret `dealership-secret`. Run `kubectl apply -f deployment.yaml` and wait for the rollouts, then forward `deployment/dealership` to local port 8000. In Skills Network Toolbox, launch port 8000 to get the actual browser URL.

Set `SENTIMENT_API_URL` to the public HTTPS base URL if deploying the analyzer to IBM Code Engine. The Kubernetes manifest uses temporary data volumes suitable for the course lab.

Based on the [IBM Skills Network starter](https://github.com/ibm-developer-skills-network/xrwvm-fullstack_developer_capstone/tree/6bf6c0a1d8dedb6d949c9878a99fafa33168319c).
