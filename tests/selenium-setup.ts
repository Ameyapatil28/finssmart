import { Builder, WebDriver, WebElement, By, until } from 'selenium-webdriver';
import * as Chrome from 'selenium-webdriver/chrome';

/**
 * Selenium WebDriver Configuration and Helper Functions
 * This file provides utilities for setting up and managing Selenium WebDriver instances
 */

export class SeleniumSetup {
    private driver: WebDriver | null = null;
    private timeout: number = 10000; // 10 seconds

    /**
     * Initialize Selenium WebDriver with Chrome
     * @param headless - Run in headless mode (default: true)
     */
    async initializeDriver(headless: boolean = true): Promise<WebDriver> {
        const options = new Chrome.Options();
        if (headless) {
            options.addArguments('--headless=new');
        }
        options.addArguments('--disable-gpu');
        options.addArguments('--no-sandbox');
        options.addArguments('--disable-dev-shm-usage');
        const service = new Chrome.ServiceBuilder().build();
        this.driver = await new Builder()
            .forBrowser('chrome')
            .setChromeOptions(options)
            .setChromeService(service)
            .build();

        // Set implicit wait
        await this.driver.manage().setTimeouts({ implicit: this.timeout });
        return this.driver;
    }

    /**
     * Navigate to URL
     */
    async navigateTo(url: string): Promise<void> {
        if (!this.driver) throw new Error('Driver not initialized');
        await this.driver.get(url);
    }

    /**
     * Find element by CSS selector
     */
    async findElement(selector: string): Promise<WebElement> {
        if (!this.driver) throw new Error('Driver not initialized');
        return this.driver.wait(until.elementLocated(By.css(selector)), this.timeout);
    }

    /**
     * Find multiple elements
     */
    async findElements(selector: string): Promise<WebElement[]> {
        if (!this.driver) throw new Error('Driver not initialized');
        return this.driver.findElements(By.css(selector));
    }

    /**
     * Click element
     */
    async clickElement(selector: string): Promise<void> {
        const element = await this.findElement(selector);
        await this.driver?.wait(until.elementIsVisible(element), this.timeout);
        await element.click();
    }

    /**
     * Type text into element
     */
    async typeText(selector: string, text: string): Promise<void> {
        const element = await this.findElement(selector);
        await element.clear();
        await element.sendKeys(text);
    }

    /**
     * Get element text
     */
    async getElementText(selector: string): Promise<string> {
        const element = await this.findElement(selector);
        return element.getText();
    }

    /**
     * Check if element is visible
     */
    async isElementVisible(selector: string): Promise<boolean> {
        try {
            const element = await this.driver?.wait(until.elementLocated(By.css(selector)), 5000);
            return element?.isDisplayed() ?? false;
        } catch {
            return false;
        }
    }

    /**
     * Wait for element to be present
     */
    async waitForElement(selector: string, timeout: number = this.timeout): Promise<WebElement> {
        if (!this.driver) throw new Error('Driver not initialized');
        return this.driver.wait(until.elementLocated(By.css(selector)), timeout);
    }

    /**
     * Wait for URL to match pattern
     */
    async waitForURL(pattern: string | RegExp, timeout: number = this.timeout): Promise<void> {
        if (!this.driver) throw new Error('Driver not initialized');
        const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
        await this.driver.wait(async () => {
            const url = await this.driver?.getCurrentUrl();
            return regex.test(url || '');
        }, timeout);
    }

    /**
     * Get current URL
     */
    async getCurrentUrl(): Promise<string> {
        if (!this.driver) throw new Error('Driver not initialized');
        return this.driver.getCurrentUrl();
    }

    /**
     * Take screenshot
     */
    async takeScreenshot(filename: string): Promise<void> {
        if (!this.driver) throw new Error('Driver not initialized');
        const screenshot = await this.driver.takeScreenshot();
        const fs = require('fs');
        fs.writeFileSync(filename, screenshot, 'base64');
    }

    /**
     * Execute JavaScript
     */
    async executeScript<T = any>(script: string, ...args: any[]): Promise<T> {
        if (!this.driver) throw new Error('Driver not initialized');
        return this.driver.executeScript(script, ...args);
    }

    /**
     * Get page title
     */
    async getPageTitle(): Promise<string> {
        if (!this.driver) throw new Error('Driver not initialized');
        return this.driver.getTitle();
    }

    /**
     * Switch to alert and accept
     */
    async acceptAlert(): Promise<void> {
        if (!this.driver) throw new Error('Driver not initialized');
        const alert = await this.driver.switchTo().alert();
        await alert.accept();
    }

    /**
     * Get alert text
     */
    async getAlertText(): Promise<string> {
        if (!this.driver) throw new Error('Driver not initialized');
        const alert = await this.driver.switchTo().alert();
        return alert.getText();
    }

    /**
     * Clear browser data
     */
    async clearBrowserData(): Promise<void> {
        if (!this.driver) throw new Error('Driver not initialized');
        await this.driver.executeScript('window.sessionStorage.clear(); window.localStorage.clear();');
    }

    /**
     * Close driver
     */
    async closeDriver(): Promise<void> {
        if (this.driver) {
            await this.driver.quit();
            this.driver = null;
        }
    }
}

export default SeleniumSetup;