---
created: 2026-01-10
modified: 2026-01-10
app_version: 0.6.0-alpha
commit: eb98256636d669972e15f377a8e7b8b064b89160
---

# Component Ideas

This document contains ideas for new components and features that could be added to the Components plugin.

## Component Ideas

### Productivity & Task Management

#### **Pomodoro Timer**
- Configurable work/break intervals
- Visual progress ring
- Desktop notifications
- Session history tracking
- Integration with task components

**Example usage:**
```
```pomodoro
work=25
break=5
sessions=4
```

#### **Habit Tracker**
- Daily habit checkboxes
- Streak counter
- Visual calendar heatmap
- Habit statistics and trends
- Configurable reset times

**Example usage:**
```
```habit-tracker
habits=exercise,reading,meditation
path=/habits
```

#### **Eisenhower Matrix**
- Quadrant-based task organization (Urgent/Important)
- Drag-and-drop interface
- Filter tasks by frontmatter properties
- Visual prioritization

**Example usage:**
```
```eisenhower
source=/tasks
filter=fm.status != "done"
```

#### **Daily Goals**
- Set and track daily goals
- Progress visualization
- Goal completion percentage
- Rollover incomplete goals

**Example usage:**
```
```daily-goals
max=3
path=__TODAY__
```

### Data Visualization

#### **Word Cloud**
- Generate word clouds from note content
- Filter by folder or tags
- Configurable colors and shapes
- Click to search vault

**Example usage:**
```
```word-cloud
source=/notes
exclude=the,and,or
max-words=50
```

#### **Mood Tracker**
- Emoji-based mood selection
- Historical mood chart
- Correlation with other metrics
- Export mood data

**Example usage:**
```
```mood-tracker
path=/daily
property=mood
range=30
```

#### **Network Graph**
- Visualize note connections
- Interactive node exploration
- Filter by tags or folders
- Link strength weighting

**Example usage:**
```
```network-graph
center=__SELF__
depth=2
```

#### **Timeline Gantt**
- Project timeline visualization
- Task dependencies
- Milestone markers
- Progress tracking

**Example usage:**
```
```timeline-gantt
source=/projects
start-date=fm.start
end-date=fm.end
```

### Information Display

#### **Weather Widget**
- Current conditions
- Multi-day forecast
- Location-based or manual
- Customizable display format

**Example usage:**
```
```weather
location=auto
days=5
units=metric
```

#### **RSS Feed Reader**
- Display RSS/Atom feeds
- Multiple feed support
- Refresh interval
- Article preview

**Example usage:**
```
```rss
feed=https://example.com/feed.xml
limit=10
```

#### **Crypto Tracker**
- Cryptocurrency prices
- Portfolio tracking
- Price alerts
- Historical charts

**Example usage:**
```
```crypto
coins=BTC,ETH,SOL
currency=USD
refresh=60
```

#### **Stock Ticker**
- Real-time stock prices
- Portfolio tracking
- Market indicators
- Price change visualization

**Example usage:**
```
```stock-ticker
symbols=AAPL,GOOGL,MSFT
refresh=300
```

### Content Creation

#### **Markdown Table Builder**
- Interactive table creation
- Cell editing
- Sort and filter columns
- Export to markdown

**Example usage:**
```
```table-builder
columns=Name,Status,Priority
editable=true
```

#### **Mermaid Live Editor**
- Real-time mermaid diagram editing
- Multiple diagram types
- Template library
- Export to code block

**Example usage:**
```
```mermaid-editor
type=flowchart
```

#### **LaTeX Equation Editor**
- Visual equation builder
- Live preview
- Common symbol palette
- Export to code block

**Example usage:**
```
```latex-editor
inline=false
```

#### **Template Expander**
- Dynamic template insertion
- Variable substitution
- Conditional sections
- Template library

**Example usage:**
```
```template
name=meeting-notes
date=__TODAY__
```

### Learning & Knowledge

#### **Flashcard Review**
- Spaced repetition system
- Create cards from notes
- Review schedule
- Statistics tracking

**Example usage:**
```
```flashcards
source=/study
due-today=true
```

#### **Reading Progress**
- Book reading tracker
- Page/chapter tracking
- Reading statistics
- Visual progress bar

**Example usage:**
```
```reading-progress
book=fm.title
current-page=fm.page
total-pages=fm.pages
```

#### **Learning Path**
- Skill progression visualization
- Prerequisite tracking
- Resource links
- Completion tracking

**Example usage:**
```
```learning-path
topic=fm.topic
level=fm.level
```

#### **Study Timer**
- Track study sessions
- Subject breakdown
- Daily/weekly goals
- Productivity insights

**Example usage:**
```
```study-timer
subject=fm.subject
goal=120
```

### Personal

#### **Journal Prompts**
- Random or sequential prompts
- Categorized prompts
- Custom prompt lists
- Streak tracking

**Example usage:**
```
```journal-prompts
category=reflection
count=3
```

#### **Gratitude Log**
- Daily gratitude entries
- Historical view
- Search and filter
- Export capabilities

**Example usage:**
```
```gratitude
path=/daily
limit=5
```

#### **Quote of the Day**
- Random quote selection
- Categorized quotes
- Custom quote database
- Share functionality

**Example usage:**
```
```quote
category=motivation
source=/quotes
```

#### **Vision Board**
- Image collage display
- Drag-and-drop arrangement
- Link to goals/notes
- Refresh with new images

**Example usage:**
```
```vision-board
source=/images/goals
layout=grid
```

### Utility

#### **QR Code Generator**
- Generate QR codes from text/URLs
- Customizable size and colors
- Download as image
- Embed in notes

**Example usage:**
```
```qr-code
content=https://example.com
size=200
```

#### **Color Palette**
- Display color swatches
- Hex/RGB/HSL values
- Copy to clipboard
- Color harmony suggestions

**Example usage:**
```
```color-palette
colors=#FF5733,#33FF57,#3357FF
format=hex
```

#### **Dice Roller**
- Roll various dice types
- Multiple dice support
- Modifier support
- Roll history

**Example usage:**
```
```dice
roll=2d6+3
show-history=true
```

#### **Random Generator**
- Generate random items from lists
- Weighted selection
- No-repeat mode
- Custom seed support

**Example usage:**
```
```random
items=idea1,idea2,idea3
weights=2,1,1
```

### Integration

#### **Google Calendar**
- Display upcoming events
- Event filtering
- Quick add events
- Sync interval

**Example usage:**
```
```google-calendar
calendar=primary
days=7
```

#### **Todoist**
- Task list display
- Filter by project/label
- Quick add tasks
- Sync with Todoist API

**Example usage:**
```
```todoist
project=Inbox
filter=today|overdue
```

#### **Spotify Now Playing**
- Current track display
- Playback controls
- Recently played
- Playlists

**Example usage:**
```
```spotify
view=now-playing
show-controls=true
```

#### **Fitbit Stats**
- Daily step count
- Activity tracking
- Sleep data
- Heart rate

**Example usage:**
```
```fitbit
metrics=steps,sleep,heart
range=7
```

### Advanced

#### **Code Runner**
- Execute code snippets
- Multiple language support
- Input/output display
- Sandboxed execution

**Example usage:**
```
```code-runner
language=python
file=/scripts/test.py
```

#### **API Tester**
- Make HTTP requests
- Request/response display
- Header customization
- Save responses

**Example usage:**
```
```api-tester
url=https://api.example.com
method=GET
```

#### **Data Table**
- Import CSV/JSON data
- Sort and filter
- Aggregate functions
- Export options

**Example usage:**
```
```data-table
source=/data/sales.csv
columns=Date,Product,Revenue
```

#### **Chart Builder**
- Multiple chart types (bar, line, pie, etc.)
- Data from notes or external sources
- Interactive tooltips
- Customizable styling

**Example usage:**
```
```chart
type=line
data=fm.metrics
x-axis=date
y-axis=value
```

## Feature Enhancements

### Expression Engine Extensions

#### **Date/Time Functions**
```
date-add(__TODAY__, 7)           # Add days
date-diff(fm.end, fm.start)      # Calculate difference
date-format(__NOW__, "HH:mm")    # Custom formatting
```

#### **String Functions**
```
lower(fm.title)                  # Convert to lowercase
upper(fm.status)                 # Convert to uppercase
substring(fm.content, 0, 100)    # Extract substring
```

#### **Array Functions**
```
length(fm.tags)                  # Array length
contains(fm.tags, "important")   # Check if contains
join(fm.tags, ", ")              # Join with delimiter
```

#### **Math Functions**
```
round(fm.value)                  # Round number
min(fm.a, fm.b)                  # Minimum value
max(fm.a, fm.b)                  # Maximum value
avg(fm.values)                   # Average of array
```

### Component System Enhancements

#### **Component Variants**
- Predefined styling variations
- Quick-switch between variants
- User-defined custom variants

```
```clock
variant=minimal
```

#### **Component Presets**
- Save commonly-used configurations
- Quick preset selection
- Share presets between vaults

```
```calendar
preset=monthly-view
```

#### **Component Nesting**
- Allow components to contain other components
- Parent-child communication
- Shared context/state

```
```widget-space
layout=grid
---
```clock```
```calendar```
---
```

#### **Component Templates**
- Create component templates for reuse
- Variable substitution
- Conditional rendering

#### **Component Marketplace**
- Browse community components
- One-click installation
- Rating and reviews
- Update notifications

### UI/UX Improvements

#### **Component Gallery**
- Visual component browser
- Live previews
- Search and filter
- Category organization

#### **Drag-and-Drop Component Builder**
- Visual arrangement of components
- No-code component creation
- Export to markdown

#### **Component Inspector**
- Debug component state
- View computed arguments
- Performance metrics
- Event log

#### **Mobile Optimization**
- Touch-friendly controls
- Responsive layouts
- Mobile-specific components
- Gesture support

### Performance & Optimization

#### **Virtual Scrolling**
- Efficient rendering of large lists
- Windowing for long content
- Lazy loading

#### **Component Caching**
- Cache component results
- Invalidate on data change
- Configurable cache duration

#### **Web Workers**
- Offload heavy computation
- Background data fetching
- Parallel processing

#### **Incremental Rendering**
- Progressive component loading
- Skeleton screens
- Smooth transitions

### Developer Experience

#### **Component CLI**
- Generate component boilerplate
- Test components in isolation
- Component documentation generator

```bash
npm run component:new my-component
npm run component:test my-component
npm run component:docs
```

#### **Hot Module Replacement**
- Update components without reload
- Preserve component state
- Faster development cycle

#### **TypeScript Improvements**
- Better type inference for args
- Auto-completion for component args
- Type-safe settings

#### **Component Testing Framework**
- Unit test utilities
- Mock Obsidian API
- Snapshot testing
- Integration tests

## Implementation Priority

### High Priority
- **Habit Tracker** - High user demand, moderate complexity
- **Word Cloud** - Visual appeal, moderate complexity
- **Journal Prompts** - Simple implementation, high value

### Medium Priority
- **Pomodoro Timer** - Popular request, requires notification API
- **Mood Tracker** - Visualization complexity
- **QR Code Generator** - External library needed

### Low Priority
- **Code Runner** - Security concerns, sandboxing complexity
- **API Tester** - Advanced feature, smaller audience
- **Component Marketplace** - Infrastructure required

## Community Requests

This section should be updated with component requests from users.

**Format:**
```
### [Component Name]
- **Requested by**: @username
- **Date**: YYYY-MM-DD
- **Description**: Brief description
- **Use case**: Why they need it
- **Status**: Planned / In Development / Completed / Won't Implement
```

## Contributing Component Ideas

To suggest a new component idea:

1. Open an issue on the GitHub repository
2. Use the "Component Idea" template
3. Provide:
   - Component name and description
   - Example usage
   - Use case explanation
   - Any relevant mockups or examples
4. Tag with `component-idea` label

The maintainers will review and potentially add to this document.
