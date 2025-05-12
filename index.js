import puppeteerExtra from "puppeteer-extra";
import Stealth from "puppeteer-extra-plugin-stealth";

puppeteerExtra.use(Stealth());

const disableFilters = true;

export default async function scraper(business, place) {
  const query = queryBuilder(business + " in " + place);
  const browserObj = await puppeteerExtra.launch({
    headless: true,
    args: ["--disable-setuid-sandbox", "--no-sandbox"],
  });
  const page = await browserObj.newPage();

  await page.setViewport({ width: 1920, height: 1080 });

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
  );

  await page.goto(`https://www.google.com/maps/search/${query}`);
  function delay(time) {
    return new Promise((resolve) => {
      setTimeout(resolve, time);
    });
  }
  const scrollableElement = await page.$(
    ".m6QErb.DxyBCb.kA9KIf.dS8AEf.XiKgde.ecceSd[role='feed']"
  );
  while (
    (await scrollableElement.$("p.fontBodyMedium > span > span.HlvSq")) == null
  ) {
    await page.evaluate((el) => el.scrollBy(0, 200), scrollableElement);
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  const gBusinsessLink = await page.$$(`a.hfpxzc`);

  const data = [];

  for (const link of gBusinsessLink) {
    const href = await link.evaluate((el) => el.href);
    // console.log(`Opening link: ${href}`);

    try {
      const newPage = await page.browser().newPage();
      await newPage.goto(href, { waitUntil: "domcontentloaded" });

      const name = await newPage.evaluate(() => {
        const element = document.querySelector("h1.DUwDvf.lfPIob");
        return element ? element.textContent.trim() : null;
      });

      const category = await newPage.evaluate(() => {
        const categoryButton = document.querySelector(
          'button[jsaction^="pane."][jsaction$=".category"]'
        );
        return categoryButton ? categoryButton.textContent.trim() : null;
      });

      const addressElements = await newPage.evaluate(() => {
        const elements = Array.from(
          document.querySelectorAll("div.Io6YTe.fontBodyMedium.kR99db.fdkmkc")
        );
        return elements.map((el) => el.textContent);
      });

      const address = addressElements[0] || null;

      function isPhoneNumber(text) {
        return /\+?\d{1,4}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/.test(
          text
        );
      }

      let phoneNumber = null;
      for (let i = 1; i < addressElements.length; i++) {
        if (isPhoneNumber(addressElements[i])) {
          phoneNumber = addressElements[i];
          break;
        }
      }

      const website = await newPage.evaluate(() => {
        const element = document.querySelector(
          'a[data-tooltip="Open website"]'
        );
        return element ? element.href : null;
      });

      const email = null;

      await newPage.close();

      if (disableFilters) {
        data.push({
          name,
          phoneNumber,
          email,
          website,
          address,
          category,
        });
        console.log({
          name,
          phoneNumber,
          email,
          website,
          address,
          category,
        });
      } else {
        if (phoneNumber && !phoneNumber.startsWith("+44 7")) {
          phoneNumber = null;
        }
        if (
          (website !== null || phoneNumber !== null) &&
          (address.includes(place) ||
            name.includes(place) ||
            (website && website.includes(place.toLowerCase())))
        ) {
          // Push the data
          data.push({
            name,
            phoneNumber,
            email,
            website,
            address,
            category,
          });
        }
      }
    } catch (error) {
      console.error(`Error processing link ${href}:`, error);
    }
  }

  // await page.waitForNetworkIdle();

  await browserObj.close();

  return data;
}

function queryBuilder(text) {
  return text.split(" ").join("+");
}
