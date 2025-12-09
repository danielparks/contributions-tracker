# Trait-Based API Architecture

This API uses Dropshot's trait-based approach, which provides significant
benefits for testing and development.

## Architecture Overview

The API is structured around three key components:

1. **`ApiBase` trait** - Defines the business logic methods
2. **`ContributionsApi` trait** - Defines HTTP endpoints with `#[endpoint]`
   attributes
3. **Implementation types** - Connect context types to the API trait

## Key Benefits

### 1. Multiple Implementations

You can create different implementations of the same API:

- Production implementation using real GitHub OAuth
- Mock implementation for testing
- In-memory implementation for development

### 2. Faster OpenAPI Generation

The trait-based approach uses `stub_api_description()` which generates OpenAPI
specs without compiling implementations:

```bash
# Fast - only needs trait definitions
cargo run -- openapi

# No need to compile the full OAuth implementation!
```

### 3. Type-Safe Testing

The same endpoint definitions work across all implementations:

```rust
// Production
let api = contributions_api_mod::api_description::<ContributionsApiImpl>()?;
let state = AppState::new(client_id, client_secret);

// Mock for testing
let api = contributions_api_mod::api_description::<MockApiImpl>()?;
let state = MockAppState::new();
```

## Usage Examples

### Production Server

```bash
cargo run -- serve --github-client-id YOUR_ID --github-client-secret YOUR_SECRET
```

### Mock Server for Testing

```bash
cargo run --example mock_server
```

Then test the endpoints:

```bash
# Health check
curl http://127.0.0.1:3001/api/health

# OAuth callback (returns mock token)
curl 'http://127.0.0.1:3001/api/oauth/callback?code=test'
```

### Generate OpenAPI Spec

```bash
# To stdout
cargo run -- openapi

# To file
cargo run -- openapi -o openapi.json
```

## Creating a Custom Implementation

To create your own implementation:

1. Implement `ApiBase` for your context type:

```rust
impl ApiBase for MyCustomState {
    async fn check_health(&self) -> String {
        "custom".to_owned()
    }

    async fn exchange_oauth_token(
        &self,
        code: String,
        log: &slog::Logger,
    ) -> Result<String, String> {
        // Your custom logic
    }
}
```

2. Create an implementation type:

```rust
pub enum MyApiImpl {}

impl ContributionsApi for MyApiImpl {
    type Context = MyCustomState;
}
```

3. Use it with Dropshot:

```rust
let api = contributions_api_mod::api_description::<MyApiImpl>()?;
let state = MyCustomState::new();
let server = HttpServerStarter::new(&config, api, state, &log)?.start();
```

## Testing

Run the unit tests for the mock implementation:

```bash
cargo test --lib
```

## References

- [Dropshot API Traits (RFD 479)](https://rfd.shared.oxide.computer/rfd/0479)
- [Dropshot Documentation](https://docs.rs/dropshot/latest/dropshot/)
- [Example Code](https://github.com/oxidecomputer/dropshot/tree/main/dropshot/examples)
