import { Component, ComponentAction, ComponentInstance } from "../../components";
import { TFile, requestUrl, App, TFolder } from "obsidian";
import { Deck, PickingInfo, MapViewState } from '@deck.gl/core';
import { ScatterplotLayer, BitmapLayer, IconLayer } from '@deck.gl/layers';
import { TileLayer } from '@deck.gl/geo-layers';
import { MapSettingTab, MapSettings, DEFAULT_MAP_SETTINGS } from './map-settings';
import { usePropertyAccess, matchesQuery } from '../../utils';
import ComponentsPlugin from "../../main";

interface MapPoint {
    lat: number;
    lng: number;
    title?: string;
    description?: string;
    color?: string;
    size?: number;
    cover?: string;
    file?: TFile;
    tags?: string[];
    frontmatter?: Record<string, unknown>;
    content?: string;
}

interface DeckDataPoint {
    position: [number, number];
    color: [number, number, number];
    radius: number;
    point: MapPoint;
}

export const map: Component<['query', 'latKey', 'lngKey', 'titleKey', 'descriptionKey', 'colorKey', 'sizeKey', 'coverKey', 'showSearch', 'searchMode', 'showTags', 'center', 'zoom', 'height', 'markerSize', 'markerColor', 'markerType', 'tileLayer']> = {
    name: 'Map',
    description: 'Display a performant map, sourced from your notes',
    keyName: 'map',
    args: {
        query: {
            description: 'Query to filter notes (supports #tags, "folder/paths", and AND operator)',
            default: ''
        },
        latKey: {
            description: 'Frontmatter key for latitude',
            default: 'lat'
        },
        lngKey: {
            description: 'Frontmatter key for longitude',
            default: 'lng'
        },
        titleKey: {
            description: 'Frontmatter key for marker title (optional)',
            default: ''
        },
        descriptionKey: {
            description: 'Frontmatter key for marker description (optional)',
            default: ''
        },
        colorKey: {
            description: 'Frontmatter key for marker color (optional)',
            default: ''
        },
        sizeKey: {
            description: 'Frontmatter key for marker size (optional)',
            default: ''
        },
        coverKey: {
            description: 'Frontmatter key for cover image to show in tooltip (optional)',
            default: ''
        },
        showSearch: {
            description: 'Show search bar to filter locations',
            default: 'false'
        },
        searchMode: {
            description: 'Search mode: "name" (title only), "surface" (all frontmatter), "depth" (frontmatter + content)',
            default: 'name'
        },
        center: {
            description: 'Center coordinates as "lat,lng"',
            default: '0,0'
        },
        showTags: {
            description: 'Show tags in tooltip',
            default: 'false'
        },
        zoom: {
            description: 'Initial zoom level',
            default: '2'
        },
        height: {
            description: 'Map height',
            default: '500px'
        },
        markerSize: {
            description: 'Default marker size in pixels',
            default: '100'
        },
        markerColor: {
            description: 'Default marker color (hex)',
            default: '#766df3'
        },
        markerType: {
            description: 'Marker type: "dots" or "pins"',
            default: 'pins'
        },
        tileLayer: {
            description: 'Tile layer URL template',
            default: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        }
    },
    isMountable: true,
    does: [ComponentAction.READ],
    render: async (args, el, ctx, app, instance: ComponentInstance, componentSettings = {}) => {
        const query = args.query || '';
        const latKey = args.latKey || 'lat';
        const lngKey = args.lngKey || 'lng';
        const titleKey = args.titleKey || '';
        const descriptionKey = args.descriptionKey || '';
        const colorKey = args.colorKey || '';
        const sizeKey = args.sizeKey || '';
        const coverKey = args.coverKey || '';
        const showSearch = args.showSearch === 'true';
        const searchMode = args.searchMode || 'name';
        const showTags = args.showTags || 'false';
        const height = args.height || '500px';
        const centerCoords = args.center.split(',').map(c => parseFloat(c.trim()));
        const zoom = parseInt(args.zoom);
        const markerSize = parseFloat(args.markerSize);
        const markerColor = args.markerColor;
        const markerType = args.markerType || 'dots';

        if (!document.getElementById('maplibre-css')) {
            try {
                const response = await requestUrl('https://unpkg.com/maplibre-gl@5.8.0/dist/maplibre-gl.css');
                const style = document.createElement('style');
                style.id = 'maplibre-css';
                style.textContent = response.text;
                document.head.appendChild(style);
            } catch (e) {
                console.error('Failed to load MapLibre CSS:', e);
            }
        }

        const wrapper = document.createElement('div');
        wrapper.style.width = '100%';
        wrapper.style.height = height;
        wrapper.style.position = 'relative';
        wrapper.style.display = 'flex';
        wrapper.style.flexDirection = 'column';
        el.appendChild(wrapper);

        let searchInput: HTMLInputElement | null = null;
        if (showSearch) {
            const searchContainer = document.createElement('div');
            searchContainer.style.padding = '10px';
            searchContainer.style.background = 'var(--background-secondary)';
            searchContainer.style.borderBottom = '1px solid var(--background-modifier-border)';
            searchContainer.style.borderTopLeftRadius = '8px';
            searchContainer.style.borderTopRightRadius = '8px';
            wrapper.appendChild(searchContainer);

            searchInput = document.createElement('input');
            searchInput.type = 'text';
            searchInput.placeholder = 'Search locations...';
            searchInput.style.width = '100%';
            searchInput.style.padding = '8px';
            searchInput.style.border = '1px solid var(--background-modifier-border)';
            searchInput.style.borderRadius = '4px';
            searchInput.style.background = 'var(--background-primary)';
            searchInput.style.color = 'var(--text-normal)';
            searchContainer.appendChild(searchInput);
        }

        const canvasContainer = document.createElement('div');
        canvasContainer.style.flex = '1';
        canvasContainer.style.position = 'relative';
        canvasContainer.style.overflow = 'hidden';
        wrapper.appendChild(canvasContainer);

        const mapContainer = document.createElement('canvas');
        mapContainer.style.width = '100%';
        mapContainer.style.height = '100%';
        mapContainer.style.display = 'block';

        mapContainer.addEventListener('mousedown', (e) => {
            if (e.button === 1) {
                e.preventDefault();
                e.stopPropagation();
            }
        });

        canvasContainer.appendChild(mapContainer);

        const tooltip = document.createElement('div');
        tooltip.style.position = 'absolute';
        tooltip.style.padding = '8px 12px';
        tooltip.style.background = 'var(--background-primary)';
        tooltip.style.color = 'var(--text-normal)';
        tooltip.style.borderRadius = '4px';
        tooltip.style.pointerEvents = 'none';
        tooltip.style.opacity = '0';
        tooltip.style.transition = 'opacity 0.2s';
        tooltip.style.zIndex = '1000';
        tooltip.style.fontSize = '14px';
        tooltip.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
        tooltip.style.maxWidth = '250px';
        canvasContainer.appendChild(tooltip);

        let isDestroyed = false;

        const updateTooltip = async (point: MapPoint, x: number, y: number) => {
            tooltip.innerHTML = '';
        
            const renderPromises: Promise<void>[] = [];
        
            if (point.cover && point.file) {
                const coverFile = app.metadataCache.getFirstLinkpathDest(point.cover, point.file.path);
                if (coverFile) {
                    const img = document.createElement('img');
                    img.style.width = '100%';
                    img.style.height = 'auto';
                    img.style.borderRadius = '4px';
                    img.style.marginBottom = '8px';
                    img.style.display = 'block';
                    
                    const renderPromise = new Promise<void>((resolve) => {
                        const onFinish = () => requestAnimationFrame(() => resolve());
                        img.onload = onFinish;
                        img.onerror = onFinish;
                    });
                    renderPromises.push(renderPromise);
                    
                    img.src = app.vault.getResourcePath(coverFile);
                    tooltip.appendChild(img);
                }
            }
        
            const titleEl = document.createElement('div');
            titleEl.textContent = point.title || 'Untitled';
            titleEl.style.fontWeight = 'bold';
            tooltip.appendChild(titleEl);
        
            if (showTags === 'true' && point.tags) {
                const tagsEl = document.createElement('div');
                tagsEl.classList.add('map-tooltip-tags');
                tagsEl.style.display = 'flex';
                tagsEl.style.flexWrap = 'wrap';
                tagsEl.style.gap = '4px';
                tagsEl.style.marginTop = '8px';
                point.tags.forEach(tagText => {
                    const tagEl = document.createElement('a');
                    tagEl.classList.add('tag');
                    tagEl.textContent = `#${tagText}`;
                    tagsEl.appendChild(tagEl);
                });
                tooltip.appendChild(tagsEl);
            }
        
            await Promise.all(renderPromises);
        
            tooltip.style.left = `${x + 15}px`;
            tooltip.style.top = `${y - 30}px`;
            tooltip.style.opacity = '1';
        };

        let points: MapPoint[] = [];

        const allFiles = app.vault.getMarkdownFiles();

        for (const file of allFiles) {
                const cache = app.metadataCache.getFileCache(file);
                const frontmatter = cache?.frontmatter;

                if (!frontmatter) continue;
                if (!matchesQuery(file, cache, query)) continue;

                const lat = usePropertyAccess(frontmatter, latKey);
                const lng = usePropertyAccess(frontmatter, lngKey);

                if (lat === undefined || lng === undefined) continue;

                const latNum = typeof lat === 'number' ? lat : parseFloat(lat);
                const lngNum = typeof lng === 'number' ? lng : parseFloat(lng);

                if (isNaN(latNum) || isNaN(lngNum)) continue;

                const point: MapPoint = {
                    lat: latNum,
                    lng: lngNum,
                    file: file
                };

                if (titleKey && frontmatter[titleKey]) {
                    point.title = String(frontmatter[titleKey]);
                } else {
                    point.title = file.basename;
                }

                if (descriptionKey && frontmatter[descriptionKey]) {
                    point.description = String(frontmatter[descriptionKey]);
                }

                if (colorKey && frontmatter[colorKey]) {
                    point.color = String(frontmatter[colorKey]);
                }

                if (sizeKey && frontmatter[sizeKey]) {
                    const sizeVal = frontmatter[sizeKey];
                    point.size = typeof sizeVal === 'number' ? sizeVal : parseFloat(sizeVal);
                }

                if (coverKey) {
                    const coverVal = usePropertyAccess(frontmatter, coverKey);
                    if (coverVal) {
                        point.cover = String(coverVal);
                    }
                }

                // Extract tags
                if (frontmatter.tags) {
                    point.tags = Array.isArray(frontmatter.tags)
                        ? frontmatter.tags
                        : [frontmatter.tags];
                }

                // Store additional data based on search mode
                if (searchMode === 'surface' || searchMode === 'depth') {
                    point.frontmatter = frontmatter;
                }

                if (searchMode === 'depth') {
                    const content = await app.vault.read(file);
                    point.content = content;
                }

                points.push(point);
        }

        if (points.length === 0) {
            throw new Error(`No notes with valid ${latKey}/${lngKey} coordinates found matching query: "${query}"`);
        }

        const configPath = `${app.vault.configDir}/plugins/components/map-config.json`;
        let mapSettings: MapSettings = { ...DEFAULT_MAP_SETTINGS };
        try {
            const exists = await app.vault.adapter.exists(configPath);
            if (exists) {
                const data = await app.vault.adapter.read(configPath);
                mapSettings = JSON.parse(data);
            }
        } catch (e) {
            console.error('Error loading map settings:', e);
        }

        // Convert hex color to RGB array
        const hexToRgb = (hex: string): [number, number, number] => {
                const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                return result ? [
                    parseInt(result[1], 16),
                    parseInt(result[2], 16),
                    parseInt(result[3], 16)
                ] : [118, 109, 243];
            };

            // Get color for a point based on tag priority
            const getPointColor = (point: MapPoint): string => {
                // If point has explicit color, use it
                if (point.color) return point.color;

                // Check tags in priority order
                if (point.tags && point.tags.length > 0) {
                    for (const tag of mapSettings.tagPriority) {
                        if (point.tags.includes(tag) && mapSettings.tagCustomizations[tag]) {
                            return mapSettings.tagCustomizations[tag].color;
                        }
                    }
                }

                return markerColor;
            };

            // Prepare data for deck.gl
            const deckData: DeckDataPoint[] = points.map(point => ({
                position: [point.lng, point.lat] as [number, number],
                color: hexToRgb(getPointColor(point)),
                radius: point.size || markerSize,
                point: point
            }));

            // Auto-fit bounds if center is default
            let initialViewState: MapViewState;
            if (args.center === '0,0' && points.length > 0) {
                const lats = points.map(p => p.lat);
                const lngs = points.map(p => p.lng);
                const minLat = Math.min(...lats);
                const maxLat = Math.max(...lats);
                const minLng = Math.min(...lngs);
                const maxLng = Math.max(...lngs);

                const centerLat = (maxLat + minLat) / 2;
                const centerLng = (maxLng + minLng) / 2;

                // Calculate zoom level to fit all points
                const latDiff = maxLat - minLat;
                const lngDiff = maxLng - minLng;
                const maxDiff = Math.max(latDiff, lngDiff);

                // Rough zoom calculation (adjust as needed)
                let autoZoom = 1;
                if (maxDiff > 0) {
                    autoZoom = Math.floor(Math.log2(360 / maxDiff)) - 1;
                    autoZoom = Math.max(1, Math.min(15, autoZoom)); // Clamp between 1-15
                }

                initialViewState = {
                    longitude: centerLng,
                    latitude: centerLat,
                    zoom: autoZoom,
                    pitch: 0,
                    bearing: 0
                };
            } else {
                initialViewState = {
                    longitude: centerCoords[1],
                    latitude: centerCoords[0],
                    zoom: zoom,
                    pitch: 0,
                    bearing: 0
                };
            }

            const baseTileUrl = args.tileLayer;

            let currentCursor = 'grab';

            let searchQuery = '';

            const createMarkerLayer = (data: DeckDataPoint[]) => {
                if (markerType === 'pins') {
                    return new IconLayer({
                        id: 'icon-layer',
                        data: data,
                        pickable: true,
                        getIcon: (d: DeckDataPoint) => {
                            const [r, g, b] = d.color;
                            return {
                                url: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
                                    `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="36" viewBox="0 0 24 36">
                                        <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24c0-6.6-5.4-12-12-12z" fill="rgb(${r},${g},${b})"/>
                                        <circle cx="12" cy="12" r="4" fill="white"/>
                                    </svg>`
                                ),
                                width: 24,
                                height: 36,
                                anchorY: 36
                            };
                        },
                        getPosition: (d: DeckDataPoint) => d.position,
                        getSize: (d: DeckDataPoint) => d.radius * 0.3,
                        sizeScale: 1,
                        sizeMinPixels: 8,
                        sizeMaxPixels: 60,
                        onClick: (info: any, event: any) => {
                            if (info.object) {
                                const point = info.object.point;
                                if (point.file) {
                                    event?.srcEvent?.preventDefault();
                                    event?.srcEvent?.stopPropagation();
                                    const newTab = event?.srcEvent?.button === 1 || event?.srcEvent?.ctrlKey || event?.srcEvent?.metaKey;
                                    app.workspace.getLeaf(newTab).openFile(point.file);
                                }
                            }
                        }
                    });
                } else {
                    // Default dots (ScatterplotLayer)
                    return new ScatterplotLayer({
                        id: 'scatterplot-layer',
                        data: data,
                        pickable: true,
                        opacity: 0.8,
                        stroked: false,
                        filled: true,
                        radiusScale: 1,
                        radiusMinPixels: 3,
                        radiusMaxPixels: 100,
                        getPosition: (d: DeckDataPoint) => d.position,
                        getRadius: (d: DeckDataPoint) => d.radius,
                        getFillColor: (d: DeckDataPoint) => d.color,
                        onClick: (info: any, event: any) => {
                            if (info.object) {
                                const point = info.object.point;
                                if (point.file) {
                                    event?.srcEvent?.preventDefault();
                                    event?.srcEvent?.stopPropagation();
                                    const newTab = event?.srcEvent?.button === 1 || event?.srcEvent?.ctrlKey || event?.srcEvent?.metaKey;
                                    app.workspace.getLeaf(newTab).openFile(point.file);
                                }
                            }
                        }
                    });
                }
            };

            // Function to filter points based on search
            const getFilteredData = (): DeckDataPoint[] => {
                if (!searchQuery) return deckData;
                const query = searchQuery.toLowerCase();

                return deckData.filter((d) => {
                    const point = d.point;

                    // Name mode - search title only
                    if (searchMode === 'name') {
                        return point.title?.toLowerCase().includes(query);
                    }

                    // Surface mode - search all frontmatter
                    if (searchMode === 'surface') {
                        if (point.title?.toLowerCase().includes(query)) return true;
                        if (point.frontmatter) {
                            const fmString = JSON.stringify(point.frontmatter).toLowerCase();
                            return fmString.includes(query);
                        }
                        return false;
                    }

                    // Depth mode - search frontmatter + content
                    if (searchMode === 'depth') {
                        if (point.title?.toLowerCase().includes(query)) return true;
                        if (point.frontmatter) {
                            const fmString = JSON.stringify(point.frontmatter).toLowerCase();
                            if (fmString.includes(query)) return true;
                        }
                        if (point.content) {
                            return point.content.toLowerCase().includes(query);
                        }
                        return false;
                    }

                    return false;
                });
            };

            // Create deck.gl instance with tile layer
            const deck = new Deck({
                canvas: mapContainer,
                initialViewState: initialViewState as any,
                controller: {
                    inertia: true,
                    scrollZoom: { speed: 0.02, smooth: true },
                    touchRotate: false,
                    keyboard: false
                },
                views: [
                    new (await import('@deck.gl/core')).MapView({
                        repeat: true
                    })
                ],
                getCursor: () => currentCursor,
                onHover: (info: PickingInfo<DeckDataPoint>) => {
                    if (info.object) {
                        const point = info.object.point;
                        updateTooltip(point, info.x, info.y);
                        currentCursor = 'pointer';
                    } else {
                        tooltip.style.opacity = '0';
                        currentCursor = 'grab';
                    }
                },
                layers: [
                    // Base map tile layer
                    new TileLayer({
                        id: 'tile-layer',
                        data: baseTileUrl,
                        minZoom: 0,
                        maxZoom: 19,
                        tileSize: 256,
                        maxCacheSize: 1000,
                        maxRequests: 6,
                        refinementStrategy: 'best-available',
                        zoomOffset: 0,
                        extent: [-180, -85.051129, 180, 85.051129],
                        renderSubLayers: (props: any) => {
                            const { bbox: { west, south, east, north } } = props.tile;

                            // Only render if tile data is loaded
                            if (!props.data) {
                                return null;
                            }

                            return new BitmapLayer(props, {
                                data: undefined,
                                image: props.data as HTMLImageElement,
                                bounds: [west, south, east, north],
                                textureParameters: {
                                    [10241]: 9729,  // TEXTURE_MIN_FILTER: LINEAR
                                    [10240]: 9729   // TEXTURE_MAG_FILTER: LINEAR
                                }
                            });
                        },
                        getTileData: (tile: { index: { x: number; y: number; z: number } }) => {
                            const { x, y, z } = tile.index;
                            const url = baseTileUrl
                                .replace('{s}', ['a', 'b', 'c'][Math.abs(x + y) % 3])
                                .replace('{z}', String(z))
                                .replace('{x}', String(x))
                                .replace('{y}', String(y))
                                .replace('{r}', '');

                            // Return image load promise
                            return new Promise((resolve, reject) => {
                                const img = new Image();
                                img.crossOrigin = 'anonymous';
                                img.onload = () => resolve(img);
                                img.onerror = reject;
                                img.src = url;
                            });
                        }
                    }),
                    // Marker layer (dots or pins)
                    createMarkerLayer(getFilteredData())
                ]
            });

            // Add search input listener
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    searchQuery = (e.target as HTMLInputElement).value;

                    // Update the marker layer with filtered data
                    deck.setProps({
                        layers: [
                            deck.props.layers[0], // Keep tile layer
                            createMarkerLayer(getFilteredData())
                        ]
                    });
                });
            }

            // Cleanup
            ComponentInstance.addCleanup(instance, () => {
                if (!isDestroyed) {
                    isDestroyed = true;
                    deck.finalize();
                }
            });

    },
    settings: {
        _render: async (containerEl: HTMLElement, app: App, plugin: ComponentsPlugin) => {
            const configPath = `${app.vault.configDir}/plugins/components/map-config.json`;

            // Load existing settings
            let settings: MapSettings = { ...DEFAULT_MAP_SETTINGS };
            try {
                const exists = await app.vault.adapter.exists(configPath);
                if (exists) {
                    const data = await app.vault.adapter.read(configPath);
                    settings = JSON.parse(data);
                }
            } catch (e) {
                console.error('Error loading map settings:', e);
            }

            // Render settings UI directly
            const settingsTab = new MapSettingTab(app, plugin, settings, configPath);
            settingsTab.containerEl = containerEl;
            settingsTab.display();
        }
    }
};
