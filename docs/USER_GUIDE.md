# Giano Codex Agent - Hướng Dẫn Sử Dụng

## Mục Lục

1. [Cài Đặt](#1-cài-đặt)
2. [Khởi Động Bot](#2-khởi-động-bot)
3. [Các Lệnh Cơ Bản](#3-các-lệnh-cơ-bản)
4. [Mẫu Câu Điều Khiển](#4-mẫu-câu-điều-khiển)
5. [Task System](#5-task-system)
6. [Cấu Hình Nâng Cao](#6-cấu-hình-nâng-cao)

---

## 1. Cài Đặt

### Yêu Cầu

- Bun runtime (https://bun.sh)
- Node.js 18+
- Giano Bot Token

### Cài Đặt Dependencies

```bash
cd giano-codex-agent
bun install
```

### Cấu Hình Environment

```bash
cp .env.example .env
```

Chỉnh sửa file `.env`:

```env
# Bắt buộc
BOT_TOKEN=your_giano_bot_token
LLM_API_KEY=your_llm_api_key

# LLM (OpenAI-compatible API)
LLM_BASE_URL=http://127.0.0.1:8045/v1
LLM_MODEL=claude-opus-4-5-thinking

# Workspace
DEFAULT_WORKSPACE=./workspace
SANDBOX_POLICY=workspace-write
```

---

## 2. Khởi Động Bot

### Development Mode (Hot Reload)

```bash
bun run dev
```

### Production Mode

```bash
bun run build
bun run start
```

### Kiểm Tra Kết Nối

Bot sẽ hiển thị banner khi kết nối thành công:

```
╔══════════════════════════════════════╗
║   🤖 Giano Codex Agent - ONLINE     ║
╠══════════════════════════════════════╣
║   Commands:                          ║
║   /agent <task>  - Execute task      ║
║   /status        - Show status       ║
║   /reset         - Reset thread      ║
║   /help          - Show help         ║
╚══════════════════════════════════════╝
```

---

## 3. Các Lệnh Cơ Bản

| Lệnh                | Mô Tả                           |
| ------------------- | ------------------------------- |
| `/start`            | Hiện thông điệp chào mừng       |
| `/help`             | Hiện danh sách lệnh             |
| `/agent <task>`     | Yêu cầu agent thực hiện task    |
| `/status`           | Xem trạng thái session hiện tại |
| `/reset`            | Xóa lịch sử hội thoại           |
| `/tasks`            | Liệt kê các task file có sẵn    |
| `/run <file>`       | Chạy một task file              |
| `/config`           | (Admin) Xem cấu hình hiện tại   |
| `/workspace <path>` | (Admin) Đổi thư mục làm việc    |

---

## 4. Mẫu Câu Điều Khiển

### 📁 Thao Tác File

```
/agent đọc file src/index.ts

/agent liệt kê tất cả file trong thư mục src

/agent tìm tất cả file .ts trong project

/agent tạo file mới src/utils/helper.ts với function hello

/agent xóa file temp.txt

/agent đổi tên file old.ts thành new.ts
```

### ✏️ Chỉnh Sửa Code

```
/agent thêm function calculateSum vào file utils.ts

/agent sửa lỗi TypeScript trong file api.ts

/agent refactor function processData trong service.ts

/agent thêm try-catch xử lý lỗi cho function fetchData

/agent thêm comments giải thích cho file auth.ts

/agent format lại code trong components/
```

### 🔍 Tìm Kiếm & Phân Tích

```
/agent tìm tất cả chỗ dùng deprecated API

/agent tìm các TODO comments trong project

/agent phân tích cấu trúc project này

/agent liệt kê các dependencies chưa sử dụng

/agent tìm các function thiếu type annotations
```

### 🧪 Testing & Verification

```
/agent chạy tests

/agent thêm unit tests cho file userService.ts

/agent chạy linting và sửa các lỗi

/agent kiểm tra TypeScript errors

/agent verify changes không break anything
```

### 🔧 Git Operations

```
/agent xem git status

/agent tạo branch mới cho feature login

/agent commit với message "Add user authentication"

/agent xem diff của các thay đổi

/agent tạo .gitignore cho Node.js project
```

### 🚀 Feature Development

```
/agent tạo REST API endpoint GET /users

/agent thêm validation cho user registration form

/agent implement pagination cho list users

/agent thêm authentication middleware

/agent tạo database model cho Product
```

### 🐛 Bug Fixing

```
/agent debug lỗi "Cannot read property of undefined" trong userController

/agent tìm và sửa memory leak trong event listeners

/agent sửa race condition trong async function

/agent fix infinite loop trong while statement
```

### 📝 Documentation

```
/agent viết README cho project

/agent thêm JSDoc cho public functions

/agent tạo API documentation

/agent viết hướng dẫn setup development environment
```

---

## 5. Task System

### Tạo Task File

Tạo file `.md` trong thư mục `tasks/`:

```markdown
---
name: Add Login Feature
description: Implement user login functionality
variables:
  component: auth
---

## Goal

Add user login with email/password

## Steps

- [ ] Create login form component
- [ ] Implement authentication service
- [ ] Add JWT token handling
- [ ] Create protected route middleware
- [ ] Add logout functionality

## Success Criteria

- [ ] Users can log in with email/password
- [ ] JWT tokens are properly managed
- [ ] Protected routes work correctly
```

### Chạy Task

```
/tasks                           # Liệt kê tasks
/run add-login-feature.md        # Chạy task cụ thể
```

### Templates Có Sẵn

| Template                   | Mô Tả                  |
| -------------------------- | ---------------------- |
| `templates/bug-fix.md`     | Template sửa bug       |
| `templates/feature.md`     | Template thêm feature  |
| `templates/refactoring.md` | Template refactor code |

---

## 6. Cấu Hình Nâng Cao

### Sandbox Policies

| Policy            | Quyền                     |
| ----------------- | ------------------------- |
| `read-only`       | Chỉ đọc file, không write |
| `workspace-write` | Write trong workspace     |
| `full-access`     | Full access (cẩn thận!)   |

### Approval Policies

| Policy       | Mô Tả                         |
| ------------ | ----------------------------- |
| `never`      | Không cần approve             |
| `on-request` | Approve cho high-risk actions |
| `always`     | Luôn cần approve              |

### Environment Variables

```env
# Bot
BOT_TOKEN=xxx
GIANO_API_URL=https://messages-api.bug.edu.vn
GIANO_WS_URL=wss://messages-api.bug.edu.vn/bot/ws

# LLM
LLM_BASE_URL=http://127.0.0.1:8045/v1
LLM_API_KEY=xxx
LLM_MODEL=claude-opus-4-5-thinking
LLM_MAX_TOKENS=8192
LLM_TEMPERATURE=0.7

# Agent
DEFAULT_WORKSPACE=./workspace
SANDBOX_POLICY=workspace-write
APPROVAL_POLICY=on-request

# Admin
ADMIN_USER_IDS=user1,user2
MAX_HISTORY_MESSAGES=50
MAX_FILE_SIZE_KB=500

# Features
AUTO_CREATE_PR=false
AUTO_RUN_TESTS=true
ENABLE_COST_TRACKING=false
```

---

## Tips & Best Practices

### ✅ Nên Làm

1. **Cụ thể hóa yêu cầu** - Càng chi tiết càng tốt
2. **Chia nhỏ task lớn** - Dễ theo dõi và sửa lỗi
3. **Kiểm tra trước khi approve** - Review changes trước khi áp dụng
4. **Dùng `/status`** - Theo dõi tiến độ thường xuyên
5. **Backup quan trọng** - Agent tự backup nhưng nên có thêm

### ❌ Không Nên

1. **Yêu cầu mơ hồ** - "Làm cho nó tốt hơn"
2. **Nhiều task cùng lúc** - Một task một lần
3. **Bỏ qua errors** - Đọc và xử lý lỗi
4. **Full-access sandbox** - Chỉ dùng khi thật sự cần

---

## Troubleshooting

### Bot không kết nối được

```bash
# Kiểm tra token
echo $BOT_TOKEN

# Kiểm tra network
curl https://messages-api.bug.edu.vn/health
```

### LLM không phản hồi

```bash
# Kiểm tra LLM server
curl http://127.0.0.1:8045/v1/models
```

### Permission denied

- Kiểm tra `SANDBOX_POLICY`
- Kiểm tra file permissions
- Kiểm tra `ADMIN_USER_IDS`

---

_Tài liệu này cho Giano Codex Agent v1.0.0_
