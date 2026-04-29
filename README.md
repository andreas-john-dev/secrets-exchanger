# Secrets Exchanger

A secure, ephemeral secrets sharing application built with AWS CDK, Angular, and enterprise-grade encryption.

## Overview

Secrets Exchanger is a web application that allows users to securely share sensitive information (passwords, API keys, personal messages, etc.) through encrypted, self-destructing links. The application ensures that secrets are automatically deleted after being read once and expire after 24 hours, providing maximum security for sensitive data sharing.

## Key Features

- **End-to-End Encryption**: Secrets are encrypted using AES-256 encryption with AWS KMS for key management
- **Self-Destructing**: Secrets are automatically deleted after being read once
- **Time-Limited**: All secrets expire after 24 hours regardless of access
- **Passphrase Protection**: Optional passphrase protection for additional security
- **Zero-Knowledge Architecture**: The server never stores unencrypted secrets
- **Modern UI**: Clean, responsive Angular Material interface
- **Enterprise-Ready**: Built on AWS serverless architecture for scalability and reliability

## Architecture

### Backend (AWS CDK)
- **AWS Lambda**: Serverless functions for secret storage and retrieval
- **Amazon DynamoDB**: Encrypted secret storage with TTL
- **AWS KMS**: Key management and encryption services
- **API Gateway**: RESTful API endpoints
- **CloudFront**: Global content delivery

### Frontend (Angular)
- **Angular 19**: Modern TypeScript framework
- **Angular Material**: Professional UI components
- **Tailwind CSS**: Utility-first styling
- **Responsive Design**: Mobile-friendly interface

## How It Works

1. **Create Secret**: User enters a secret message and optional passphrase
2. **Encryption**: Secret is encrypted client-side and server-side with multiple layers
3. **Storage**: Encrypted data is stored in DynamoDB with 24-hour TTL
4. **Share**: User receives a secure link containing encrypted access credentials
5. **Retrieve**: Recipient uses the link and passphrase to decrypt and view the secret
6. **Destruction**: Secret is immediately deleted after being read

## Security Features

- **Double Encryption**: Client-side AES encryption + AWS KMS encryption
- **Encryption Context**: Additional security context for KMS operations
- **No Persistent Storage**: Secrets are never stored in plaintext
- **Automatic Cleanup**: TTL-based automatic deletion from DynamoDB
- **CORS Protection**: Proper cross-origin resource sharing configuration
- **Input Validation**: Comprehensive request validation and sanitization

## Project Structure

```
├── src/stacks/api/                    # Backend Lambda handlers
│   ├── store-encrypted-secret.handler.ts  # Secret creation endpoint
│   ├── read-secret.handler.ts             # Secret retrieval endpoint
│   ├── encryption-service.ts              # Encryption utilities
│   └── types.ts                           # TypeScript interfaces
├── src/stacks/website/secrets-exchanger-web-app/  # Angular frontend
│   ├── src/app/public/create-secret/      # Secret creation component
│   ├── src/app/public/read-secret/        # Secret reading component
│   └── src/app/public/secrets.service.ts  # API service
└── src/stacks/                           # CDK infrastructure stacks
    ├── apiStack.ts                       # API and Lambda stack
    ├── statefulStack.ts                  # DynamoDB and KMS stack
    └── websiteStack.ts                   # Frontend hosting stack
```

## Deployment

This project uses AWS CDK with Projen for infrastructure as code:

```bash
# Install dependencies
npm install

# Deploy to AWS
npm run deploy

# Run tests
npm run test

# Build the project
npm run build
```

## Development

The project is built with modern development practices:

- **TypeScript**: Full type safety across frontend and backend
- **Projen**: Project configuration and build management
- **Jest**: Comprehensive testing framework
- **ESLint & Prettier**: Code quality and formatting
- **CDK Nag**: Security and best practices validation

## License

Apache-2.0