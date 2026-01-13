import asyncio
import sys
import json
import re
from playwright.async_api import async_playwright

async def scrape_magicpin(restaurant_name, city):
    async with async_playwright() as p:
        # Launch browser (headless by default, but can be set to False for debugging)
        browser = await p.chromium.launch()
        page = await browser.new_page()

        try:
            # 1. Search Google
            query = f"site:magicpin.in {restaurant_name} {city}"
            # Use 'gsearch' or just standard google url.
            # Adding 'hl=en' to ensure English results
            await page.goto(f"https://www.google.com/search?q={query}&hl=en")

            # Wait for results.
            # Selector for standard Google search result links often involves 'h3' parent 'a'
            # or just 'a[href*="magicpin.in"]'
            await page.wait_for_selector('a[href*="magicpin.in"]', timeout=5000)
            
            results = await page.locator('a[href*="magicpin.in"]').all()
            
            if not results:
                print(json.dumps({"error": "No Magicpin link found on Google"}))
                return

            # Click the first relevant result
            first_link_url = await results[0].get_attribute("href")
            
            # Navigate nicely
            await page.goto(first_link_url)
            await page.wait_for_load_state('domcontentloaded')

            # 2. Extract Discount
            # Magicpin usually shows "Save X%" or "X% OFF".
            # We'll try a few broad text strategies looking for the pattern 'Save \d+%'
            
            # Common Magicpin merchant page structure might change, so text search is slightly more robust.
            # Example text: "Save 35%"
            
            discount_text = None
            try:
                # Look for elements containing "Save" followed by digits and %
                # This xpath finds text containing 'Save' and '%'
                # text-match-regex is powerful in playwright
                element = page.locator("text=/Save \\d+%|\\d+% OFF/i").first
                if await element.count() > 0:
                    discount_text = await element.text_content()
                else:
                    # Fallback: sometimes it's just a number and '%' icon, or slightly different text.
                    # Let's try to grab any text that looks like a high percentage discount 
                    pass
            except:
                 pass

            if not discount_text:
                # Try to find specific classes if text fails, or regex on the whole body text (less reliable but fallback)
                body_text = await page.content()
                match = re.search(r'Save\s+(\d+%?)', body_text, re.IGNORECASE)
                if match:
                    discount_text = match.group(0)
                else:
                    match_off = re.search(r'(\d+%\s+OFF)', body_text, re.IGNORECASE)
                    if match_off:
                        discount_text = match_off.group(0)

            result = {
                "provider": "Magicpin",
                "discount": discount_text.strip() if discount_text else "No offer found",
                "deep_link": page.url,
                "last_updated": "now" # This will be replaced/used by backend timestamp usually
            }

            print(json.dumps(result))

        except Exception as e:
            error_res = {"error": str(e)}
            print(json.dumps(error_res))
        finally:
            await browser.close()

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: python engine.py <name> <city>"}))
        sys.exit(1)
    
    name = sys.argv[1]
    city = sys.argv[2]
    
    asyncio.run(scrape_magicpin(name, city))
