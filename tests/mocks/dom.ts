// dom.ts - Mock DOM APIs for testing

// Mock window.moment for formatDate tests
(global as any).window = {
    moment: (date: Date) => {
        return {
            format: (formatStr: string) => {
                if (!formatStr) {
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                }

                // Basic moment.js format support for tests
                let result = formatStr;

                // Month names - must be done BEFORE MM to avoid conflicts
                const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                                  'July', 'August', 'September', 'October', 'November', 'December'];
                if (formatStr.includes('MMMM')) {
                    result = result.replace('MMMM', monthNames[date.getMonth()]);
                } else if (formatStr.includes('MMM')) {
                    result = result.replace('MMM', monthNames[date.getMonth()].slice(0, 3));
                }

                result = result.replace('YYYY', String(date.getFullYear()));
                result = result.replace('MM', String(date.getMonth() + 1).padStart(2, '0'));
                result = result.replace('DD', String(date.getDate()).padStart(2, '0'));
                result = result.replace('HH', String(date.getHours()).padStart(2, '0'));
                result = result.replace('mm', String(date.getMinutes()).padStart(2, '0'));
                result = result.replace('ss', String(date.getSeconds()).padStart(2, '0'));

                // Day with ordinal
                const day = date.getDate();
                const ordinal = day === 1 || day === 21 || day === 31 ? 'st' :
                               day === 2 || day === 22 ? 'nd' :
                               day === 3 || day === 23 ? 'rd' : 'th';
                result = result.replace('Do', `${day}${ordinal}`);

                return result;
            }
        };
    }
};

// Mock basic HTMLElement for applyCssFromArgs tests
class MockHTMLElement {
    style: any = {};
    private classes: Set<string> = new Set();

    constructor() {
        const props: Record<string, string> = {};
        this.style = {
            setProperty(key: string, value: string) {
                // Validate that it looks like a real CSS property
                if (key.startsWith('invalid-')) {
                    // Don't set it and leave empty
                    return;
                }
                props[key] = value;
                // Also set as direct property for camelCase access
                const camelKey = key.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                (this as any)[camelKey] = value;
            },
            getPropertyValue(key: string) {
                return props[key] || '';
            }
        };
        // Add getters for common properties
        Object.defineProperty(this.style, 'color', {
            get() { return props.color || ''; },
            set(val) { props.color = val; }
        });
        Object.defineProperty(this.style, 'fontSize', {
            get() { return props['font-size'] || ''; },
            set(val) { props['font-size'] = val; }
        });
    }

    addClass(className: string) {
        this.classes.add(className);
    }

    hasClass(className: string) {
        return this.classes.has(className);
    }
}

(global as any).document = {
    createElement(tag: string) {
        return new MockHTMLElement();
    }
};
