# Nhắc ôn tập bằng Web Push — Từ Từ

Bản cập nhật giữ nguyên JavaScript thuần, hash router `#/review`, Supabase hiện tại và service worker/cache offline. Chỉ thêm mục Nhắc ôn tập vào Cài đặt. Font tiếp tục là Be Vietnam Pro.

## 1. Thiết lập trên Vercel

1. Mở đúng project Từ Từ trong Vercel. Vào Storage hoặc Marketplace → tìm **Upstash Redis** → tạo database và chọn gói miễn phí nếu tài khoản hiện cung cấp. Chọn vùng gần Vercel Function/Việt Nam, nối database với project và môi trường **Production**. Không cần máy chủ riêng hoặc giữ laptop online.
2. Lấy **REST URL** và **REST token có quyền ghi** từ Upstash. Nếu tích hợp chưa tự tạo env đúng tên, thêm `UPSTASH_REDIS_REST_URL` và `UPSTASH_REDIS_REST_TOKEN` trong Project → Settings → Environment Variables. Code cũng nhận `KV_REST_API_URL` / `KV_REST_API_TOKEN` cho kho Vercel KV cũ. Không dùng token read-only.
3. Mở CMD tại thư mục mã nguồn, chạy:

   ```cmd
   npm install
   npx web-push generate-vapid-keys
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   ```

   Lệnh thứ hai tạo cặp Public/Private VAPID. Lệnh cuối tạo CRON_SECRET. Tự giữ kết quả, không đưa private key, Redis token hoặc CRON_SECRET vào GitHub/chat công khai. Tạo VAPID **một lần**, dùng ổn định; đổi khóa sẽ yêu cầu tắt/bật lại đăng ký trên các thiết bị.
4. Thêm các env sau ở Vercel **Production**:

   | Tên | Giá trị |
   | --- | --- |
   | VAPID_PUBLIC_KEY | Public Key vừa tạo |
   | VAPID_PRIVATE_KEY | Private Key vừa tạo |
   | VAPID_SUBJECT | `mailto:email-cua-ban@example.com` — thay bằng email liên hệ của bạn |
   | CRON_SECRET | Chuỗi ngẫu nhiên vừa tạo, tối thiểu32 ký tự |
   | UPSTASH_REDIS_REST_URL | REST URL của database |
   | UPSTASH_REDIS_REST_TOKEN | REST token quyền ghi |
   | PUSH_SCHEDULE_MODE | `daily` |
   | PUSH_REDIS_PREFIX | `tutu:push:v1` |

   Giữ nguyên các env SUPABASE đang dùng. Không thêm secret nào vào JS phía trình duyệt. Dự án không dùng Vite/Next: `npm run build` tự tạo `assets/js/push-config.js`, chỉ chứa public key, trạng thái cấu hình và chế độ lịch; không cần NEXT_PUBLIC_/VITE_. Không chỉnh file này bằng tay trên production.
5. Đẩy mã mới lên GitHub rồi **Redeploy** production sau khi thêm env. Vercel vẫn dùng `npm run build`, output `dist`; các Node Functions được nhận từ `/api/push/*.js` ở gốc source. Không tải riêng mỗi thư mục dist lên GitHub thay cho toàn bộ source.
6. Mở Project → **Settings → Cron Jobs**: phải thấy `/api/push/cron` với `0 13 * * *`. Cron Vercel chỉ chạy cho production, không chạy trên preview. Xem Function Logs khi cần, không dán log chứa thông tin bí mật. Endpoint chỉ trả số lượng tổng hợp, không log endpoint/subscription.
7. Mở website production → nếu PWA báo bản mới thì cập nhật khi đã kết thúc lượt học → Cài đặt → **Nhắc ôn tập** → bật và chọn Cho phép. Sau đó bấm **Gửi thử thông báo**. Dòng “đã gửi” xác nhận dịch vụ đã chấp nhận yêu cầu, không bảo đảm hệ điều hành đã hiển thị.

## 2. Giờ nhắc và giới hạn

- Mặc định: **20:00 giờ Việt Nam**, tương ứng **13:00 UTC**. Input giờ được khóa và server cũng kiểm tra lịch cố định.
- Hobby chỉ cho một lần chạy/ngày cho cron này, và không bảo đảm đúng phút: có thể chạy trong **20:00–20:59**. Gói miễn phí không thể hẹn mỗi người một giờ khác nhau chỉ với một lần gọi cron.
- Redis dùng một claim theo endpoint đã băm + ngày địa phương, giữ48 giờ: cron gọi lặp/song song không gửi lại trong cùng ngày. Chấp nhận một rủi ro nhỏ để tránh gửi trùng: nếu Function chết sau khi giữ claim nhưng trước khi gửi, thông báo hôm đó có thể bị bỏ lỡ. Lỗi gửi thông thường sẽ nhả claim cho lần gọi lại.
- Vercel không tự thử lại cron bị lỗi. Có thể gọi lại thủ công trong ngày: những thiết bị đã gửi thành công được bỏ qua. Function xử lý tối đa45 giây trước khi ngừng nhận việc mới; `remaining>0` cần gọi lại. Thiết kế dành cho app cá nhân/ít người dùng.
- Thông báo có TTL một giờ, tag `daily-review`; hệ điều hành có thể trì hoãn vì mất mạng, tiết kiệm pin, chế độ Tập trung/Không làm phiền. Đóng app/tab vẫn nhận được khi hệ điều hành/trình duyệt hỗ trợ chạy push nền; tắt máy hoặc buộc dừng hoàn toàn trình duyệt có thể ngăn nhận.
- Bản này dùng nội dung chung, **chưa gửi số từ/chuỗi lên Redis và chưa tự bỏ qua khi đã ôn xong**. Tránh dùng số liệu cũ khi đổi tài khoản hoặc dùng nhiều thiết bị. Đây là phần tùy chọn chưa triển khai.
- Đăng ký theo **thiết bị/trình duyệt**, không theo tài khoản Supabase. Desktop và điện thoại bật riêng. Đăng xuất tài khoản không tắt nhắc học; muốn tắt trên thiết bị thì dùng công tắc Nhắc ôn tập.

## 3. Chọn giờ riêng / cron15 phút

1. Chuyển env `PUSH_SCHEDULE_MODE=flexible` rồi redeploy để client cho chỉnh giờ.
2. Nếu dùng Vercel Pro, đổi cron trong vercel.json thành `*/15 * * * *` rồi deploy. **Không deploy biểu thức này lên Hobby**.
3. Hoặc vẫn dùng Hobby, giữ/xóa cron ngày trong vercel.json và dùng một cron bên ngoài gọi URL `https://TEN-MIEN-CUA-BAN/api/push/cron` mỗi15 phút, luôn kèm header `Authorization: Bearer CRON_SECRET`. Không đặt secret vào query URL. Nếu giữ cả cron ngày thì daily claim vẫn ngăn gửi trùng.
4. Server so sánh giờ hiện tại với `time` theo `timeZone` của từng đăng ký. Lần chạy đầu tiên sau giờ đã chọn sẽ gửi (độ trễ thường dưới15 phút). Nếu cron bị ngắt, lần chạy lại sau giờ hẹn trong cùng ngày vẫn có thể gửi bù. Không gửi bù cho ngày trước.
5. UI hiện dùng múi giờ Việt Nam; API đã hỗ trợ múi giờ IANA hợp lệ để mở rộng sau. Một đăng ký tối đa một thông báo/ngày, kể cả khi đổi giờ giữa ngày. Nút gửi thử độc lập, giới hạn5 lần/giờ/thiết bị.

## 4. Chạy local và kiểm thử thật sau khi có env

Cần Node hỗ trợ `--env-file` (Node20.12+), một database Upstash thật và mạng truy cập push provider.

```cmd
copy .env.example .env
```

Điền các env thật vào `.env` (đã gitignore). Dùng prefix riêng `tutu:push:local` để không trộn đăng ký localhost và production.

```cmd
npm run start:push
```

Mở **http://127.0.0.1:8765/tu-tu/** trong Chrome/Edge. Local server hỗ trợ cả static assets, public config và /api/push; không phục vụ file .env/server source. Bật thông báo trong Cài đặt, bấm gửi thử. Đây là push thật qua server → push service → service worker; không dùng local notification để giả kết quả test.

Thử bảo vệ cron trong một cửa sổ CMD khác:

```cmd
curl.exe -i http://127.0.0.1:8765/api/push/cron
curl.exe -i -H "Authorization: Bearer sai" http://127.0.0.1:8765/api/push/cron
set /p TUTU_CRON_TEST_SECRET=Dan CRON_SECRET cua ban:
curl.exe -i -H "Authorization: Bearer %TUTU_CRON_TEST_SECRET%" http://127.0.0.1:8765/api/push/cron
set TUTU_CRON_TEST_SECRET=
```

Hai lệnh đầu phải401. Lệnh đúng secret trả200 và số `sent/expired/failed/skipped/remaining`. **Cron chỉ gửi khi đã đến giờ và chưa gửi trong ngày**; gọi buổi sáng ở chế độ daily có `sent=0` là đúng. Dùng nút gửi thử để kiểm tra ngay; hoặc ở local chuyển flexible và chọn giờ cách hiện tại1–2 phút trước khi gọi cron.

Nếu dùng production, thay origin trong các lệnh bằng domain thật. Không chia sẻ CMD chứa secret.

Danh sách cần làm trên thiết bị thật:

1. **Chrome Android:** bật Nhắc ôn tập, cho phép quyền, gửi thử, kiểm tra thông báo hệ thống. Đóng PWA rồi gọi cron đúng giờ/secret và kiểm tra vẫn nhận. Kiểm tra chế độ tiết kiệm pin/thông báo của Chrome nếu bị trì hoãn.
2. **Chrome/Edge desktop:** thử gửi khi tab đang mở; click thông báo phải focus tab đó và đi `#/review`. Đóng tab/app rồi gửi lại, click phải mở Từ Từ tại `#/review`. Nếu đã thoát hẳn trình duyệt, kiểm tra tùy chọn chạy ứng dụng nền của trình duyệt/hệ điều hành.
3. Tắt công tắc: Redis phải mất đăng ký tương ứng, browser unsubscribe; cron không gửi tiếp. Khi mất mạng, browser được unsubscribe trước, việc xóa server được giữ lại và thử lại lúc online/mở app.
4. **iPhone/iPad:** iOS/iPadOS16.4+; Safari → Chia sẻ → Thêm vào Màn hình chính; mở từ icon → bật thông báo bằng thao tác trực tiếp; thử nhận khi app đóng. Trong tab Safari chưa cài, UI chỉ hướng dẫn cài, không tự xin quyền.
5. Thử từ chối quyền: UI hiện “Đã bị chặn” và hướng dẫn bật lại trong cài đặt trang web. App không tự xin quyền khi mở trang Cài đặt.

## 5. Kiến trúc / bảo mật

- `POST /api/push/subscribe`: nhận subscription, token quản lý thiết bị, time/timeZone/enabled. Băm endpoint làm field key; chỉ lưu dữ liệu cần gửi push.
- `POST /api/push/settings`: cập nhật lịch/bật-tắt; cần đúng token thiết bị.
- `POST /api/push/unsubscribe`: xóa; idempotent, cần token.
- `POST /api/push/test`: gửi thử thật bằng web-push, cần token và đăng ký đang bật.
- `GET /api/push/cron`: đúng Authorization Bearer CRON_SECRET mới chạy. Redis setNX + Lua bảo vệ quyền sở hữu và chống cạnh tranh.
- Client tạo token ngẫu nhiên256 bit, lưu riêng trong localStorage cùng trạng thái thiết bị; server chỉ giữ hash token. Token này không phải đăng nhập/tài khoản.
- Body giới hạn8KiB; validate HTTPS provider allowlist, P-256/auth keys, giờ/múi giờ, kiểu dữ liệu và độ dài. Không cho gửi tới localhost/private URL. Rate limit60 mutations/giờ/IP; test5 lần/giờ/endpoint. Chỉ chấp nhận POST same-origin; không mở CORS.
- Key Redis mặc định `tutu:push:v1:subscriptions`, field SHA-256(endpoint); claim và rate counters cùng prefix có TTL. Raw endpoint/keys nằm trong bản ghi để web-push hoạt động, không đưa vào log hoặc phản hồi danh sách.
- SW import `assets/js/push-worker.js`; giữ nguyên offline cache; /api không bị cache hoặc biến thành HTML fallback. Notification URL phải cùng origin và trong scope; mặc định `./#/review`.
- Chỉ thêm hai runtime dependency: `web-push`, `@upstash/redis`.

## 6. File thêm/sửa

Thêm:
- `api/push/{subscribe,unsubscribe,settings,test,cron}.js`
- `server/push/{validation,service,redis-store,http,runtime,public-config}.cjs`
- `assets/js/{push-config,push-service,push-worker}.js`
- `assets/js/features/push-reminder.js`, `assets/css/push-reminder.css`
- `tests/push-{server,http,client}.test.cjs`
- Tài liệu này và plan `docs/superpowers/plans/2026-10-26-web-push.md`.

Sửa: `index.html`, `sw.js`, `assets/js/features/{settings,profile}.js`, `assets/js/main.js`, `tools/{serve,build-web}.cjs`, `vercel.json`, `package.json`, `package-lock.json`, `.env.example`, `precache-manifest.js`, `README.md`, `tests/{build-config,worker}.test.cjs`, `tests/dom-check.cjs`.

## 7. Giả định và giới hạn kiểm thử

- Chọn Upstash vì repo chưa có KV; gói miễn phí phù hợp quy mô cá nhân trong hạn mức nhà cung cấp, không cam kết mọi mức dùng luôn miễn phí.
- Giữ Be Vietnam Pro đang dùng thay cho Space Grotesk/Space Mono trong mô tả cũ.
- Không thay đổi tài khoản/Supabase hoặc lưu từ điển lên Redis. Mỗi thiết bị đăng ký độc lập, múi giờ UI là Việt Nam.
- Chưa tự cấu hình Vercel/Upstash/VAPID hay deploy; tài khoản/secret do bạn thiết lập theo các bước trên.
- Các bài tự động dùng transport/kho Redis mô phỏng ở ranh giới mạng để kiểm tra logic; không đồng nghĩa đã nhận push thật trên điện thoại. Kết quả test tự động và trình duyệt được ghi sau khi chạy trong lần bàn giao này. Test push production, Android/iOS vật lý và thông báo nền OS cần thực hiện sau cấu hình.

Tham khảo chính thức: [Vercel cron](https://vercel.com/docs/cron-jobs/usage-and-pricing), [bảo vệ cron](https://vercel.com/docs/cron-jobs/manage-cron-jobs), [Upstash/Vercel](https://upstash.com/docs/redis/howto/vercelintegration), [web-push](https://github.com/web-push-libs/web-push), [WebKit iOS16.4](https://webkit.org/blog/13966/webkit-features-in-safari-16-4/).
