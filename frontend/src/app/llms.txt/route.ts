import { COMPANY } from "@/lib/company";

const API_URL = process.env.API_URL || "http://localhost:8080";

export const revalidate = 3600;

export async function GET() {
  let categoryLines = "";
  let articleLines = "";

  try {
    const catRes = await fetch(`${API_URL}/api/categories`, { next: { revalidate: 3600 } });
    if (catRes.ok) {
      const { data: cats } = await catRes.json();
      categoryLines = cats
        .map((c: { name: string; slug: string }) => `- [${c.name}](${COMPANY.url}/categories/${c.slug})`)
        .join("\n");
    }
  } catch {
    // empty
  }

  try {
    const res = await fetch(`${API_URL}/api/sitemap`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const { data } = await res.json();
      articleLines = data
        .filter((item: { slug: string }) => !/^\d+$/.test(item.slug))
        .slice(0, 50)
        .map((item: { slug: string }) => `- [${item.slug}](${COMPANY.url}/articles/${item.slug})`)
        .join("\n");
    }
  } catch {
    // empty
  }

  const body = `# ${COMPANY.legalName}

> ${COMPANY.tagline}. ${COMPANY.legalName} (MST ${COMPANY.taxId}, thành lập ${COMPANY.founded}, đại diện ${COMPANY.representative}) là công ty đấu giá hợp danh hoạt động tại ${COMPANY.address.region}.

## Thông tin công ty
- [Giới thiệu](${COMPANY.url}/about)
- Địa chỉ: ${COMPANY.address.full}
- Điện thoại: ${COMPANY.phoneDisplay}
- Mã số thuế: ${COMPANY.taxId}

## Thông báo đấu giá
- [Toàn bộ thông báo](${COMPANY.url}/articles)

### Danh mục
${categoryLines || "(không có dữ liệu)"}

### Thông báo gần đây (tối đa 50)
${articleLines || "(không có dữ liệu)"}
`;

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
