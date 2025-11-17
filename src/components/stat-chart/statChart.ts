import { Component, ComponentAction, ComponentInstance } from "components";
import { matchesQuery } from "utils";

declare global {
    interface Window {
        Chart: any;
    }
}

export const statChart: Component<['query', 'field', 'type', 'threshold', 'label', 'startDate', 'endDate', 'height']> = {
    name: 'Chart',
    keyName: 'stat-chart',
    icon: 'trending-up',
    aliases: ['chart'],
    args: {
        query: {
            description: 'Query to filter files',
            required: true
        },
        field: {
            description: 'Field to use for chart',
            required: true
        },
        type: {
            description: 'Type of chart (bar, line)',
            default: 'bar'
        },
        threshold: {
            description: 'Threshold for success',
            default: '0'
        },
        label: {
            description: 'Label for chart',
            default: 'Chart'
        },
        startDate: {
            description: 'Start date',
            required: true
        },
        endDate: {
            description: 'End date',
            required: true
        },
        height: {
            description: 'Height of chart',
            default: '400'
        }
    },
    isMountable: false,
    does: [ComponentAction.READ, ComponentAction.WRITE, ComponentAction.EXTERNAL],
    styles: null,
    render: async (args, el, ctx, app, instance: ComponentInstance, componentSettings = {}) => {
        const query = args.query;
        const field = args.field;
        const chartType = args.type || 'bar';
        const threshold = parseInt(args.threshold) || 0;
        const label = args.label || 'Count';

        // Default dates
        const today = new Date().toISOString().split('T')[0];
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const startDate = args.startDate || weekAgo;
        const endDate = args.endDate || today;
        
        let chartInstance: any = null;
        
        // Load Chart.js
        const loadChartJS = async () => {
            if (window.Chart) return window.Chart;
            
            return new Promise((resolve) => {
                const existingScript = document.querySelector('script[src*="chart.js"]');
                if (existingScript) {
                    existingScript.addEventListener('load', () => resolve(window.Chart));
                    return;
                }
                const chartScript = document.createElement('script');
                chartScript.src = "https://cdn.jsdelivr.net/npm/chart.js";
                chartScript.addEventListener('load', () => resolve(window.Chart));
                document.head.appendChild(chartScript);
            });
        };
        
        const generateDateRange = (start: string, end: string) => {
            const allDates: { isoDate: string; formatted: string }[] = [];
            const currentDate = new Date(start);
            const lastDate = new Date(end);
            
            const dateFormatter = new Intl.DateTimeFormat('en-US', {
                month: 'short',
                day: 'numeric'
            });
            
            while (currentDate <= lastDate) {
                const isoDate = currentDate.toISOString().split('T')[0];
                allDates.push({
                    isoDate: isoDate,
                    formatted: dateFormatter.format(currentDate)
                });
                currentDate.setDate(currentDate.getDate() + 1);
            }
            
            return allDates;
        };
        
        const getStatData = (start: string, end: string) => {
            const statsByDate: Record<string, number> = {};
            const allFiles = app.vault.getMarkdownFiles();
            
            allFiles.forEach(file => {
                const cache = app.metadataCache.getFileCache(file);
                
                // Check if file matches query
                if (!matchesQuery(file, cache, query)) {
                    return;
                }
                
                const frontmatter = cache?.frontmatter;
                if (frontmatter && frontmatter[field]) {
                    const fieldData = Array.isArray(frontmatter[field]) ? frontmatter[field] : [frontmatter[field]];
                    fieldData.forEach((date: string) => {
                        const dateStr = new Date(date).toISOString().split('T')[0];
                        if (dateStr >= start && dateStr <= end) {
                            statsByDate[dateStr] = (statsByDate[dateStr] || 0) + 1;
                        }
                    });
                }
            });
            
            return statsByDate;
        };
        
        // Create UI
        const container = el.createEl('div', { cls: 'stat-chart-container' });
        
        const filterContainer = el.createEl('div', { cls: 'stat-chart-filters' });
        
        const startInput = el.createEl('input', { type: 'date', value: startDate });
        
        const endInput = el.createEl('input', { type: 'date', value: endDate });
        
        const chartContainer = el.createEl('div', { cls: 'stat-chart' });
        chartContainer.style.height = args.height || '400px';
        
        filterContainer.appendChild(startInput);
        filterContainer.appendChild(document.createTextNode(' to '));
        filterContainer.appendChild(endInput);
        
        container.appendChild(filterContainer);
        container.appendChild(chartContainer);
        el.appendChild(container);
        
        await loadChartJS();
        
        const updateChart = () => {
            const dateRange = generateDateRange(startInput.value, endInput.value);
            const statsByDate = getStatData(startInput.value, endInput.value);
            
            const labels = dateRange.map(d => d.formatted);
            const data = dateRange.map(d => statsByDate[d.isoDate] || 0);
            const backgroundColor = threshold > 0 
                ? dateRange.map(d => 
                    (statsByDate[d.isoDate] || 0) >= threshold 
                        ? 'rgba(75, 192, 192, 0.8)' 
                        : 'rgba(54, 162, 235, 0.8)')
                : 'rgba(54, 162, 235, 0.8)';

            chartContainer.empty();
            const canvas = el.createEl('canvas');
            chartContainer.append(canvas);
            
            if (chartInstance) {
                chartInstance.destroy();
            }
            
            chartInstance = new window.Chart(canvas, {
                type: chartType,
                data: {
                    labels: labels,
                    datasets: [{
                        label: label,
                        data: data,
                        backgroundColor: backgroundColor
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(255, 255, 255, 0.1)' }
                        }
                    }
                }
            });
        };
        
        // Determine what frontmatter properties to use for saving dates
        const startDateFMKey = args.original.startDate?.startsWith('fm.') ? args.original.startDate.slice(3) : 'chartStartDate';
        const endDateFMKey = args.original.endDate?.startsWith('fm.') ? args.original.endDate.slice(3) : 'chartEndDate';

        const currentFile = app.workspace.getActiveFile();
        startInput.addEventListener('change', () => {
            if (currentFile) {
                app.fileManager.processFrontMatter(currentFile, (frontmatter) => {
                    frontmatter[startDateFMKey] = startInput.value;
                });
            }
            updateChart();
        });

        endInput.addEventListener('change', () => {
            if (currentFile) {
                app.fileManager.processFrontMatter(currentFile, (frontmatter) => {
                    frontmatter[endDateFMKey] = endInput.value;
                });
            }
            updateChart();
        });
        
        updateChart();
    },
    settings: {}
}