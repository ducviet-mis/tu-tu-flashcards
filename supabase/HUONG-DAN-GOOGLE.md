# Bật đăng nhập Google cho Từ Từ

App đã có nút **Tiếp tục với Google** ở trang đăng nhập và đăng ký. Bạn cần cấu hình một lần trên Google Cloud và Supabase. Không cần chạy máy chủ trên laptop, thêm SQL hay thêm Google Secret vào Vercel.

Các địa chỉ dưới đây dùng cho `https://tutuvn.vercel.app`. Nếu đổi tên miền, thay địa chỉ web ở Google và Supabase tương ứng.

## 1. Lấy địa chỉ callback của Supabase

Mở đúng project ở [Supabase Dashboard](https://supabase.com/dashboard) → **Authentication → Sign In / Providers → Google**. Sao chép **Callback URL** mà trang này hiển thị, thường có dạng:

```text
https://<project-ref>.supabase.co/auth/v1/callback
```

Đây là mẫu; dùng URL thật của project bạn, không dán nguyên `<project-ref>`.

## 2. Tạo thông tin Google

Mở [Google Cloud Console](https://console.cloud.google.com/), tạo hoặc chọn project dành cho Từ Từ. Vào **Google Auth Platform**:

1. **Branding**: điền tên `Từ Từ`, email hỗ trợ và email liên hệ.
2. **Audience**: chọn **External** để phục vụ người dùng ngoài tổ chức. Khi thử nghiệm, thêm email của bạn trong **Test users** nếu console yêu cầu. Trước khi mở công khai, kiểm tra trạng thái xuất bản và yêu cầu xác minh ngay trong console.
3. **Data Access**: chỉ dùng quyền đăng nhập cơ bản `openid`, email, hồ sơ; không cần Gmail hoặc Drive.
4. **Clients → Create client**: chọn **Web application**, đặt tên `Từ Từ Web`.

Điền đúng hai ô sau:

| Ô trong Google | Giá trị |
|---|---|
| Authorized JavaScript origins | `https://tutuvn.vercel.app` |
| Authorized redirect URIs | Callback URL Supabase lấy ở bước 1 |

Origins không chứa đường dẫn hoặc `#/login`. Tạo client rồi lưu **Client ID** và **Client Secret** ở nơi riêng; Secret có thể chỉ hiển thị lúc tạo.

## 3. Bật Google trong Supabase

Quay lại Google provider ở bước 1:

- Bật **Enable Sign in with Google**.
- Dán **Client ID** và **Client Secret** từ Google, rồi **Save**.

Hai giá trị này nhập trong Supabase. Không đưa Client Secret vào GitHub, frontend, hoặc tin nhắn.

Vào **Authentication → URL Configuration**:

| Mục | Giá trị |
|---|---|
| Site URL | `https://tutuvn.vercel.app` |
| Redirect URLs | `https://tutuvn.vercel.app/` |

Google trả về Supabase; Supabase trả người dùng về web. Vì vậy Google redirect URI và Supabase Redirect URLs là hai địa chỉ khác nhau.

Vercel tiếp tục dùng `SUPABASE_URL` và `SUPABASE_PUBLISHABLE_KEY` hiện có. Nếu đã nối đúng project, không cần thêm biến Google.

## 4. Thử sau khi triển khai bản mới

1. Mở `https://tutuvn.vercel.app/#/login`, bấm **Tiếp tục với Google**.
2. Chọn tài khoản và đồng ý đăng nhập. App quay về hồ sơ với tên/email Google.
3. Tải lại trang để kiểm tra phiên đăng nhập còn được giữ.
4. Đăng nhập cùng Google trên điện thoại; kiểm tra tiến trình nếu đã bật [lưu dữ liệu theo tài khoản](HUONG-DAN-DONG-BO.md).
5. Thử hủy đăng nhập: app phải trở về trang đăng nhập với thông báo rõ ràng.

Supabase tự liên kết danh tính cùng email theo quy tắc của dịch vụ. Với tài khoản email cũ, kiểm tra UID trong **Authentication → Users** sau khi đăng nhập Google để xác nhận vẫn cùng tài khoản; dùng Google có email khác sẽ là tài khoản khác. App lưu tiến trình theo UID.

## Khi gặp lỗi

| Hiện tượng | Cách kiểm tra |
|---|---|
| Google chưa được bật | Kiểm tra provider đã bật và lưu trong đúng project Supabase |
| `redirect_uri_mismatch` | So sánh Google redirect URI với Callback URL Supabase, đúng từng ký tự |
| `invalid_client` | Kiểm tra Client ID/Secret thuộc cùng OAuth client và đã lưu vào Supabase |
| Bị chặn khi thử | Kiểm tra Audience, Test users và thông báo cụ thể của Google |
| Quay về localhost hoặc sai web | Sửa Site URL và Redirect URLs trong Supabase |
| Giao diện vẫn cũ | Triển khai bản mới, cập nhật PWA rồi mở lại app |

Chỉ cấu hình đăng nhập Google không cần chạy lại SQL. Đăng nhập Google hoạt động độc lập với SMTP gửi email.

## Tài liệu đối chiếu

- [Supabase: đăng nhập Google](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Google: tạo và quản lý OAuth client](https://support.google.com/cloud/answer/15549257)
- [Google: thông tin và xác minh thương hiệu](https://developers.google.com/identity/protocols/oauth2/production-readiness/brand-verification)
- [Supabase: liên kết danh tính](https://supabase.com/docs/guides/auth/auth-identity-linking)

Kiểm tra mã nguồn và tài liệu ngày 24/10/2026. Chưa xác nhận cấu hình trong Google Cloud/Supabase thực tế của bạn; cần thử tài khoản thật sau các bước trên.
