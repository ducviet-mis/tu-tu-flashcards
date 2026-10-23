# Bật đăng nhập cho Từ Từ trên Supabase và Vercel

Bản cập nhật có đăng nhập email/mật khẩu, đăng ký, xác nhận email, quên mật khẩu,
đặt mật khẩu mới, đăng xuất và đổi tên hiển thị. Nút Google đã nối Supabase OAuth;
bạn cần bật Google provider trước khi dùng.

Bạn không cần bật laptop hay tự vận hành máy chủ. Vercel phục vụ giao diện,
Supabase Auth xử lý tài khoản và phiên đăng nhập.

## 1. Bật Email trong Supabase

Mở project `tu-tu-flashcards` → **Authentication → Sign In / Providers → Email**.
Tùy phiên bản dashboard, mục này có thể có tên **Providers**.

- Bật **Enable Email provider**.
- Cho phép người dùng mới đăng ký nếu mục **Allow new users to sign up** đang tắt.
- Giữ **Confirm email** bật để người dùng xác nhận địa chỉ email.
- Có thể đặt độ dài mật khẩu tối thiểu là 8 ký tự, phù hợp form đăng ký trong app.

Không tạo bảng mật khẩu trong `public`. Supabase quản lý mật khẩu trong hệ thống Auth.
Người dùng tự tạo tài khoản qua trang `/#/register` của Từ Từ.

## 2. Đặt URL trả về

Vào **Authentication → URL Configuration**:

| Mục | Giá trị |
|---|---|
| Site URL | `https://tutuvn.vercel.app` |
| Redirect URLs | `https://tutuvn.vercel.app/` |

Bấm **Save**. Giữ dấu `/` cuối ở Redirect URLs. Nếu đổi tên miền, cập nhật cả hai mục.
App dùng địa chỉ gốc để nhận phản hồi xác thực, rồi tự mở trang tài khoản hoặc trang
đặt mật khẩu. Không nhập `/#/login` hay tự thêm `/auth/callback` vào Site URL.

Nếu thử bằng máy local qua `npm start`, thêm `http://localhost:8765/` vào Redirect URLs.
Nếu bạn mở bằng `127.0.0.1` hoặc đường dẫn `/tu-tu/`, thêm đúng địa chỉ đó, ví dụ
`http://127.0.0.1:8765/tu-tu/`. Không cần cho phép tất cả các tên miền Vercel.

## 3. Nối hai biến trên Vercel

Lấy **Project URL** từ Supabase **Settings → Data API**, và **Publishable key**
từ **Settings → API Keys**.

Mở Vercel → project **tutu → Environment Variables**, thêm:

| Tên biến | Giá trị |
|---|---|
| `SUPABASE_URL` | URL dạng `https://ten-du-an.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | Khóa dạng `sb_publishable_...` |

Chọn môi trường **Production**. Nếu muốn thử deployment Preview, cấu hình biến cho
Preview và thêm đúng URL Preview vào Supabase Redirect URLs.

Chỉ dùng publishable key hoặc anon key cũ. Không dùng `sb_secret_...`, `service_role`,
mật khẩu database hay Google Client Secret trong hai biến này. Build sẽ từ chối khóa riêng tư.
URL và publishable key là cấu hình công khai được gửi tới trình duyệt; RLS kiểm soát
quyền truy cập dữ liệu.

Đẩy bản code mới lên GitHub. File `vercel.json` đã đặt:

```text
Build Command: npm run build
Output Directory: dist
Framework Preset: Other
```

Nếu Vercel đang có thiết lập Override khác, đổi về các giá trị trên.
Mở **Deployments → Redeploy** sau khi thay biến. Deployment cũ không tự nhận biến mới.
Không cần tạo Vercel Function cho chức năng đăng nhập này.

Build tạo file cấu hình công khai trong `dist/assets/js/supabase-config.js` và cập nhật
bộ nhớ đệm PWA theo cấu hình đó. Nó không đưa `.env`, công cụ phát triển hay SQL lên web.
File cấu hình trong mã nguồn để trống để web vẫn chạy chế độ khách khi chưa cấu hình.

## 4. Thử đăng nhập trước

1. Chờ Vercel báo deployment **Ready**, mở `https://tutuvn.vercel.app/#/login`.
2. Nếu PWA báo có bản mới, lưu phần đang nhập rồi bấm **Cập nhật**.
3. Bấm **Đăng ký**, nhập tên, email và mật khẩu hai lần.
4. Mở email xác nhận. Sau khi xác nhận, app chuyển về trang tài khoản.
5. Thử tải lại trang, đăng xuất rồi đăng nhập lại.
6. Kiểm tra tài khoản tại **Supabase → Authentication → Users**.
7. Thử **Quên mật khẩu**, mở liên kết trong email và đặt mật khẩu mới.

Nếu chỉ muốn thử đăng nhập ngay mà chưa thiết lập email gửi:
vào **Authentication → Users → Add user → Create new user**, tự nhập email/mật khẩu
của tài khoản thử và chọn xác nhận email cho riêng tài khoản đó nếu dashboard có mục này.
Sau đó đăng nhập bằng tài khoản vừa tạo. Không cần tắt xác nhận email cho toàn bộ app.

## 5. Email xác nhận và quên mật khẩu khi mở app cho mọi người

Dịch vụ gửi email mặc định của Supabase chỉ gửi tới địa chỉ thuộc nhóm của project,
và đang giới hạn khoảng 2 email/giờ. Nó phù hợp để thử với chủ project, không đủ cho
đăng ký công khai.

Để người dùng bất kỳ nhận email xác nhận và đặt lại mật khẩu:

1. Chuẩn bị một dịch vụ gửi email có hỗ trợ SMTP và địa chỉ gửi đã được xác minh.
2. Vào Supabase **Authentication → Email / SMTP Settings** hoặc **Custom SMTP**.
3. Bật Custom SMTP và điền Sender email, Sender name (`Từ Từ`), Host, Port,
   Username, Password do dịch vụ email cung cấp.
4. Lưu và thử lại bằng một email khác email quản trị project.

Thông tin SMTP chỉ điền trong Supabase, không đưa vào Vercel frontend hoặc GitHub.
Đây là dịch vụ gửi email bên ngoài; không phải máy chủ bạn phải bật trên laptop.

## 6. Bật nút “Tiếp tục với Google”

Phần này tùy chọn, không cần để đăng nhập bằng email/mật khẩu.

1. Mở [Google Cloud Console](https://console.cloud.google.com/), tạo/chọn project.
2. Vào Google Auth Platform, cấu hình Branding và Audience. Nếu đang ở chế độ
   Testing, thêm email tài khoản thử vào Test users.
3. Tạo OAuth Client ID, loại **Web application**.
4. Trong **Authorized JavaScript origins**, thêm `https://tutuvn.vercel.app`.
5. Mở Supabase **Authentication → Sign In / Providers → Google**, sao chép
   Callback URL do Supabase hiển thị.
6. Dán Callback URL đó vào **Authorized redirect URIs** ở Google.
7. Sao chép Client ID và Client Secret từ Google sang phần Google provider trong
   Supabase, bật provider và lưu.
8. Trở về app và thử nút Google. Không đưa Google Client Secret vào mã nguồn.

Callback URL ở bước 5 thuộc Supabase; nó khác Site URL Vercel ở bước 2 phía trên.

## Dữ liệu nào đã được nối trong bản này?

- Tài khoản, phiên đăng nhập và tên hiển thị: Supabase Auth.
- Nếu bạn đã chạy `tu_tu_supabase.sql`, trigger có sẵn sẽ tạo hồ sơ/cài đặt mặc định
  khi có tài khoản mới. Không cần chạy lại SQL chỉ để bật đăng nhập.
- Sổ từ, lịch ôn và thống kê: vẫn là dữ liệu trên thiết bị, không tự tải lên các bảng
  học tập khi đăng nhập. Màn hình tài khoản ghi rõ điều này.
- Đăng xuất giữ nguyên sổ từ trên thiết bị. Chế độ khách vẫn hoạt động.
- Đồng bộ bằng mã riêng trong bản cũ vẫn có thể mở tại phần Cài đặt; nó dùng cơ chế
  riêng, không phải đồng bộ theo tài khoản Auth.
- Không có số liệu người dùng hay trạng thái “đã đồng bộ” giả từ bản giao diện mẫu.

## Khi gặp lỗi

| Hiện tượng | Kiểm tra |
|---|---|
| “Đăng nhập hiện chưa sẵn sàng” | Hai biến môi trường, Build Command, Output Directory và deployment mới nhất |
| Không nhận email / Email address not authorized | Custom SMTP; địa chỉ nhận có thuộc nhóm project không |
| Email hoặc mật khẩu chưa đúng | Tài khoản nằm trong Authentication → Users của đúng project |
| Cần xác nhận email | Mở email xác nhận trước khi đăng nhập |
| Liên kết trả về localhost | Site URL và Redirect URLs; gửi lại email mới sau khi sửa |
| Liên kết đã hết hạn | Yêu cầu liên kết mới; không dùng lại email cũ |
| Google chưa bật / Unsupported provider | Bật Google provider, kiểm tra Client ID/Secret và Callback URL |
| Vẫn thấy giao diện cũ | Mở app, bấm Cập nhật ở thông báo PWA, rồi tải lại |

Tài liệu chính thức được đối chiếu ngày 23/10/2026:

- [Đăng nhập bằng mật khẩu](https://supabase.com/docs/guides/auth/passwords)
- [Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
- [Custom SMTP và giới hạn email mặc định](https://supabase.com/docs/guides/auth/auth-smtp)
- [Đăng nhập Google](https://supabase.com/docs/guides/auth/social-sign-in/auth-google)
- [Biến môi trường Vercel](https://vercel.com/docs/environment-variables/managing-environment-variables)
