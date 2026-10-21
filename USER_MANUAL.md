# Sari-Sari Store POS & Inventory Management System
## Simple User Manual

Welcome to the **Sari-Sari Store POS & Inventory System**. This guide explains every part of the system in simple, easy-to-understand words.

---

## 1. System Roles & Login

The system has two separate portals to keep things safe and organized:

### A. Admin Portal (Store Owner / Manager)
* **Who can use it**: Administrators only.
* **What it does**: Manage store inventory, view sales and profit charts, add cashiers, and configure store settings.
* **How to login**: Enter your **Username** or **Email** and your **Password**.
* **Forgot Password**: Click *Forgot Password*, enter your registered email address, type the 6-digit OTP code sent to your email, and create a new password.

### B. POS Portal (Cashier Counter)
* **Who can use it**: Cashiers only.
* **What it does**: Scan items, punch orders, calculate change, and print receipts.
* **Role Protection**: Administrators cannot access POS with their admin credentials; they must use a cashier account.

---

## 2. Point of Sale (POS) Module

This is the main screen used to ring up customer purchases.

### Core Functions:
1. **Browse Products (Unique Catalog View)**:
   * All items are shown as clean, unique visual cards with no duplicates for different cost batches. Items are differentiated only if they have different net weights (e.g., `SUMMIT 500ml` vs. `SUMMIT 1000ml`).
   * Total stock across all batches is automatically combined on the card.
   * If an item is completely expired, it shows a red **EXPIRED** tag and cannot be added.
2. **FEFO & FIFO Automated Stock Deduction**:
   * When an item is sold, the system automatically pulls stock from the batch that is nearest to expiring first (**First-Expired, First-Out / FEFO**).
   * If expiration dates are identical, it falls back to **First-In, First-Out (FIFO)**.
   * Once a batch is completely exhausted, the system seamlessly rolls over and sells from the next batch with its respective cost and profit recorded.
3. **Search & Filter**:
   * Type in the search box to find an item by its name or barcode number.
   * Click category buttons (e.g., *Beverages*, *Snacks*) to quickly filter items.
4. **Barcode Scanner**:
   * Click the **Barcode** icon to open your camera.
   * Scan any item's barcode to automatically add it to the order.
5. **Current Order (Cart)**:
   * **Adjust Quantity**: Click **+** or **-** to change the item count.
   * **Delete Single Item**: Click the red trash icon next to an item to remove it.
   * **Remove All**: Click the red **Remove all** button at the top of the order list to clear the entire cart in one tap.
6. **Checkout & Change Calculation**:
   * Type the cash amount received from the customer into the **Cash** box.
   * The system automatically shows the exact **Change** in green.
   * Click **Complete Purchase** to finish the sale.
7. **Receipt Printing**:
   * After checkout, a receipt pop-up appears with the date, cashier name, item list, total price, cash given, and change.
   * Click **Print** to send the receipt to your receipt printer or save it as a PDF.
8. **Transaction History**:
   * Switch to the **History** tab to see past sales made by the cashier during the day.

---

## 3. Dashboard Module (Admin)

Provides an instant snapshot of how your store is performing.

### Core Functions:
1. **Sales & Profit Summary**:
   * **Today's Sales**: Total money collected today.
   * **Monthly Sales & Net Profit**: Income earned and actual profit made after deducting item costs.
   * **Low Stock Alert**: Number of products that need to be reordered soon.
2. **Sales Chart**:
   * A bar graph comparing Sales vs. Profit day-by-day.
   * Use the Month and Year dropdowns to inspect previous months.
3. **Quick Add / Restock**:
   * Buttons to quickly add a new item or add more stock to an existing item directly from the dashboard.

---

## 4. Inventory Management Module (Admin)

Where you view and control all products and inventory batches in your store.

### Core Functions:
1. **Inventory Table & Batch Splitting**:
   * Shows every product with its Barcode, Item Name, Category, Stock, Expiry Date, Unit Cost, Profit Markup, and Selling Price.
   * **Batch Separation by Cost**: If a restocked batch has a different cost price or profit markup compared to earlier inventory, it is displayed as a separate batch/lot entry in the table (`Batch #1`, `Batch #2`) rather than overwriting existing cost records.
   * Hover over the batch badge to see the complete expiration schedule of all active shipments.
2. **Mandatory Expiration Date & Automated Daily Expiry Audit**:
   * **Strict Expiry Required**: An expiration date is required whenever adding or restocking products.
   * **Automated Expiry Log**: A background job runs automatically every day. When a batch reaches or passes its expiration date, the system immediately marks it as non-sellable (0 stock) and automatically creates an entry in `stock_logs` with type `EXPIRED`, batch ID, lost quantity, and financial cost.
3. **Restocking Form Autofill & Batch Selection**:
   * When restocking via **+ Restock** (or clicking the restock icon on any row), pick the product from the dropdown.
   * **Select Batch to Restock**: You can choose **+ Create New Batch** or select an existing active batch to add incoming units directly to that specific batch.
   * If creating a new batch, barcode and category are pre-filled while cost, markup, expiration date, and quantity are open for manual entry. If an existing batch is selected, its cost, markup, and expiry date are automatically loaded.
4. **Adding a New Item (+ Add Item)**:
   * **Photo**: Upload a picture from your computer or snap one using your phone camera. If you want to remove the picture, hover your mouse over the picture box and click the red trash can icon.
   * **Item Name & Net Weight**: Type the product name and package size (e.g., `500ml`, `25g`).
   * **Unit**: Choose between pieces (`pcs`) or packs (`packs`).
   * **Pricing**: Type your purchase cost and your profit markup (choose either fixed Peso `₱` or percentage `%`). The selling price is calculated automatically.
   * **Stock & Alerts**: Set starting quantity and the low-stock warning threshold.
   * **Mandatory Expiry**: Select the expiration date for the initial batch.
5. **Editing an Item & Batch Selection**:
   * Click the pencil icon on any item row to edit prices, change photos, or update expiration dates.
   * **Select Batch to Edit**: If a product has multiple batches, you can select which batch you want to modify (quantity, cost, markup, or expiry date) or edit general product details.
6. **Adjusting Stock (Damaged / Expired / Lost)**:
   * Click the minus icon on any item or batch row to manually record lost, expired, or damaged goods.
   * **Select Batch to Deduct From**: Choose a specific batch to deduct from (its available stock and expiry date are shown), or keep **Auto-Deduct (Earliest Expiry)** to let the system automatically deduct units using FEFO.
   * Subtraction is tracked with exact batch purchase cost in Adjustments History.
7. **Deleting an Item**:
   * Click the red trash icon on any row to completely remove a product from the system.

---

## 5. Adjustments History Module (Admin)

* **What it does**: Shows a complete history of all lost, damaged, or expired items deducted from inventory.
* **Why it matters**: Helps store owners see how much money was lost to broken goods or spoilage and keeps your stock numbers 100% accurate.

---

## 6. Top Selling Products Module (Admin)

* **What it does**: Displays a ranked leaderboard of your store's most popular items.
* **Why it matters**: Tells you which items sell the fastest so you know what products to keep stocked.

---

## 7. Settings Module (Admin)

Customize store information and manage staff accounts.

### Core Functions:
1. **Store Information**:
   * Change your **Store Name**. Once saved, the name in the top header updates immediately everywhere.
2. **Alert Preferences**:
   * Set the default stock threshold number (e.g., alert when stock is 10 or less).
3. **Account Management**:
   * **Create Accounts**: Add new Cashier or Administrator accounts with their username, email, and password.
   * **Update Accounts**: Change account emails or roles.
   * **Reset Password**: Send an email verification OTP to reset a staff member's password.
   * **Delete Accounts**: Remove former staff accounts (the system prevents deleting the last administrator).

---

## 8. System-Wide Smart Features

1. **Real-Time Auto Update**:
   * You don't have to refresh your browser manually. When a cashier sells an item on POS, the Admin inventory and Dashboard sales automatically update every 5 seconds.
2. **Toast Notifications**:
   * Whenever you save, update, delete, or complete a purchase, a modern notification card pops up at the top of your screen to confirm what happened.
