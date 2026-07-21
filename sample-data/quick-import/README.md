# Quick Import Samples

Small, ready-to-paste CSVs for demoing the **Import** tab (and the column-header
differences the **Data Mapping** tab handles). Each file uses a different schema style,
matching the three fictional customers.

| File | Schema style | Paste into |
|------|--------------|------------|
| `abc-clients.csv` | Title Case headers (`Client ID`, `Client Name`) | Import tab |
| `xyz-clients.csv` | camelCase headers (`clientId`, `companyName`) | Import tab |
| `premier-clients.csv` | snake_case headers (`client_id`, `business_name`) | Import tab |

**Demo flow:** add a customer (Customer Info) → map their `id`/`name` headers using the
header names below (Data Mapping) → provision (Tenant Setup) → paste the matching CSV
here (Import) → 100%.
