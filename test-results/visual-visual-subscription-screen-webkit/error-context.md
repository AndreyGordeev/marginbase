# Page snapshot

```yaml
- generic [ref=e3]:
  - complementary [ref=e4]:
    - heading "MarginBase" [level=3] [ref=e5]
    - generic [ref=e6]:
      - text: "Language:"
      - combobox "Language:" [ref=e7]:
        - option "English" [selected]
        - option "Deutsch"
        - option "Français"
        - option "Español"
        - option "Polski"
        - option "Italiano"
        - option "Русский"
    - button "Dashboard" [ref=e8] [cursor=pointer]
    - button "Profit" [ref=e9] [cursor=pointer]
    - button "Break-even" [ref=e10] [cursor=pointer]
    - button "Cashflow" [ref=e11] [cursor=pointer]
    - button "Subscription" [ref=e12] [cursor=pointer]
    - button "Data & Backup" [ref=e13] [cursor=pointer]
    - button "Settings" [ref=e14] [cursor=pointer]
  - main [ref=e15]:
    - generic [ref=e16]:
      - heading "Subscription" [level=2] [ref=e17]
      - paragraph [ref=e18]: Monthly plans (Price TBD)
      - generic [ref=e19]:
        - button "Upgrade with Stripe" [ref=e20] [cursor=pointer]
        - button "Manage Subscription" [ref=e21] [cursor=pointer]
        - button "Activate Bundle (Local Mock)" [ref=e22] [cursor=pointer]
        - button "Refresh Subscription Status" [ref=e23] [cursor=pointer]
      - generic [ref=e24]:
        - paragraph [ref=e25]: Free trial requires a payment method.
        - paragraph [ref=e26]: After the trial, your subscription renews automatically unless cancelled.
      - generic [ref=e27]:
        - button "Terms of Service" [ref=e28] [cursor=pointer]
        - button "Cancellation & Withdrawal" [ref=e29] [cursor=pointer]
```