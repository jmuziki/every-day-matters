import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Toaster } from '@/components/ui/sonner'
import { RefreshCw, Calendar, Share2 } from '@phosphor-icons/react'
import { useKV } from '@github/spark/hooks'
import { toast } from 'sonner'

interface Holiday {
  name: string
  description?: string
  category?: string
  reason?: string
}

interface DailyContent {
  date: string
  holiday: Holiday
  memeUrl: string
}

function App() {
  const [content, setContent] = useKV<DailyContent | null>('daily-holiday-content', null)
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [memeLoading, setMemeLoading] = useState(false)

  const today = new Date().toDateString()

  const fetchHolidays = async () => {
    const date = new Date()
    const month = date.getMonth() + 1
    const day = date.getDate()
    
    try {
      const response = await fetch(`https://api.api-ninjas.com/v1/holidays?country=US&year=${date.getFullYear()}&month=${month}&day=${day}`, {
        headers: {
          'X-Api-Key': 'demo' // Using demo mode
        }
      })
      
      if (!response.ok) {
        throw new Error('Holiday API failed')
      }
      
      const holidays = await response.json()
      return holidays.length > 0 ? holidays : getFallbackHolidays()
    } catch (error) {
      console.log('Using fallback holidays due to API issue')
      return getFallbackHolidays()
    }
  }

  const getFallbackHolidays = () => {
    const date = new Date()
    const monthDay = `${date.getMonth() + 1}-${date.getDate()}`
    
    const fallbackHolidays: Record<string, Holiday[]> = {
      '1-1': [{ name: 'New Year\'s Day', description: 'Fresh start, new bugs to fix!' }],
      '2-14': [{ name: 'Valentine\'s Day', description: 'Love is in the air... and in your code' }],
      '3-14': [{ name: 'Pi Day', description: 'Celebrating the most famous mathematical constant' }],
      '4-1': [{ name: 'April Fools\' Day', description: 'The day when even your IDE plays pranks' }],
      '7-24': [{ name: 'National Tequila Day', description: 'Time to debug with a different kind of spirit!' }],
      '9-29': [{ name: 'Coffee Appreciation Day', description: 'Fuel for developers worldwide' }],
      '10-31': [{ name: 'Halloween', description: 'The scariest bugs come out today' }],
      '12-25': [{ name: 'Christmas Day', description: 'Time for some holiday coding magic' }]
    }
    
    return fallbackHolidays[monthDay] || [
      { name: 'International Debugging Day', description: 'Every day is debugging day for engineers!' },
      { name: 'Productive Coding Day', description: 'A perfect day to ship some features' },
      { name: 'Code Quality Day', description: 'Time to refactor and make things beautiful' }
    ]
  }

  const selectBestHoliday = async (holidays: Holiday[]) => {
    if (holidays.length === 1) return holidays[0]
    
    const prompt = spark.llmPrompt`You are selecting the most fun, interesting, or funny holiday for an engineering team to share. 

Here are today's holidays:
${holidays.map(h => `- ${h.name}: ${h.description || 'No description'}`).join('\n')}

Pick the ONE holiday that would be most entertaining, surprising, or relatable for software engineers. Consider:
- Humor potential
- Uniqueness/obscurity 
- Relevance to tech culture
- Shareability among teammates

Respond with just the holiday name exactly as listed above, followed by | and a brief reason why it's the best choice for engineers.`

    try {
      const result = await spark.llm(prompt, 'gpt-4o-mini')
      const [selectedName, reason] = result.split('|').map(s => s.trim())
      
      const selectedHoliday = holidays.find(h => 
        h.name.toLowerCase() === selectedName.toLowerCase() ||
        selectedName.toLowerCase().includes(h.name.toLowerCase()) ||
        h.name.toLowerCase().includes(selectedName.toLowerCase())
      )
      
      if (selectedHoliday) {
        return { ...selectedHoliday, reason }
      }
    } catch (error) {
      console.log('AI selection failed, using first holiday')
    }
    
    return holidays[0]
  }

  const generateMeme = async (holiday: Holiday, forceNew = false) => {
    const holidayName = holiday.name.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim()
    
    // Engineering-focused meme library with reliable GIFs - curated for tech audiences
    const engineeringHolidayMemes: Record<string, string[]> = {
      'national tequila day': [
        'https://media.giphy.com/media/3ohc1452eax2y7D8M8/giphy.gif', // tequila shots celebration
        'https://media.giphy.com/media/3o7TKEDwfkgW8mZzUs/giphy.gif', // margarita celebration
        'https://media.giphy.com/media/YOK9jLlP2aukAmlKa8/giphy.gif'  // cheers with shots
      ],
      'coffee appreciation day': [
        'https://media.giphy.com/media/KzJkzjggfGN5Py6nkT/giphy.gif', // coffee addiction
        'https://media.giphy.com/media/3o7TKYdGh8KRi4P8xG/giphy.gif', // need more coffee
        'https://media.giphy.com/media/LbfNLRFe2g632/giphy.gif'        // coffee love
      ],
      'international debugging day': [
        'https://media.giphy.com/media/QHE5gWI0QjqF2/giphy.gif',      // frustrated programmer
        'https://media.giphy.com/media/xTiN0L7EW5trfOvEk0/giphy.gif', // debugging stress
        'https://media.giphy.com/media/yYSSBtDgbbRzq/giphy.gif'       // computer problems
      ],
      'productive coding day': [
        'https://media.giphy.com/media/26tn33aiTi1jkl6H6/giphy.gif',  // fast typing
        'https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif',      // intense coding
        'https://media.giphy.com/media/ZVik7pBtu9dNS/giphy.gif'       // hacking/coding
      ],
      'code quality day': [
        'https://media.giphy.com/media/5wWf7GR2nhgamhRnEuA/giphy.gif', // clean code satisfaction
        'https://media.giphy.com/media/vFKqnCdLPNOKc/giphy.gif',      // perfectionist approval
        'https://media.giphy.com/media/3owzW5c1tPq63MPmWk/giphy.gif'   // chef's kiss (quality)
      ],
      'pi day': [
        'https://media.giphy.com/media/APqEbxBsVlkWSuFpth/giphy.gif', // pi mathematical
        'https://media.giphy.com/media/BmmfETghGOPrW/giphy.gif',      // math celebration
        'https://media.giphy.com/media/xT5LMHxhOfscxPfIfm/giphy.gif'  // pie pun
      ],
      'april fools day': [
        'https://media.giphy.com/media/YR8neVRcCSqwmJkb1D/giphy.gif', // got pranked
        'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif', // evil laugh
        'https://media.giphy.com/media/xT1XGESDlxj0GwoDRe/giphy.gif'  // prank reveal
      ],
      'new years day': [
        'https://media.giphy.com/media/l0MYC0LajbaPoEADu/giphy.gif', // new year coding
        'https://media.giphy.com/media/3o7abrH8o4HMgEAV9e/giphy.gif', // fresh start
        'https://media.giphy.com/media/xT9IgzoKnwFNmISR8I/giphy.gif'  // resolution coding
      ],
      'valentines day': [
        'https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif',      // love for coding
        'https://media.giphy.com/media/26tn33aiTi1jkl6H6/giphy.gif',  // passionate coding
        'https://media.giphy.com/media/3owzW5c1tPq63MPmWk/giphy.gif'   // code love
      ],
      'halloween': [
        'https://media.giphy.com/media/QHE5gWI0QjqF2/giphy.gif',      // scary bugs
        'https://media.giphy.com/media/xTiN0L7EW5trfOvEk0/giphy.gif', // spooky debugging
        'https://media.giphy.com/media/yYSSBtDgbbRzq/giphy.gif'       // computer horror
      ],
      'christmas day': [
        'https://media.giphy.com/media/26tn33aiTi1jkl6H6/giphy.gif',  // holiday coding
        'https://media.giphy.com/media/vFKqnCdLPNOKc/giphy.gif',      // santa approval
        'https://media.giphy.com/media/LbfNLRFe2g632/giphy.gif'        // gift of code
      ]
    }
    
    // Try exact match first
    if (engineeringHolidayMemes[holidayName]) {
      const memes = engineeringHolidayMemes[holidayName]
      const index = forceNew ? 
        Math.floor(Math.random() * memes.length) : 
        Math.floor(Date.now() / 3600000) % memes.length
      return memes[index]
    }
    
    // Try partial matches for variations
    for (const [key, memes] of Object.entries(engineeringHolidayMemes)) {
      if (holidayName.includes(key) || key.includes(holidayName)) {
        const index = forceNew ? 
          Math.floor(Math.random() * memes.length) : 
          Math.floor(Date.now() / 3600000) % memes.length
        return memes[index]
      }
    }
    
    // Use AI to generate an engineering-themed meme selection
    const prompt = spark.llmPrompt`You're a staff engineer selecting a meme for "${holiday.name}" to share with your engineering team.

Think about how this holiday relates to engineering culture, developer life, or tech humor. Pick ONE of these reliable engineering meme categories that best fits:

1. coding_stress - For stressful/intense holidays (debugging, deadlines, complex problems)
2. coding_celebration - For achievement/happy holidays (successful deploys, feature launches)  
3. coffee_coding - For energy/productivity holidays (caffeine, work fuel, late nights)
4. perfectionist_code - For quality/precision holidays (clean code, best practices)
5. hacker_typing - For active/dynamic holidays (building, creating, shipping)
6. tech_approval - For approval/satisfaction holidays (code reviews, achievements)

Respond with just the category name that best matches the engineering vibe of "${holiday.name}".`
    
    const engineeringMemeCategories = {
      'coding_stress': [
        'https://media.giphy.com/media/QHE5gWI0QjqF2/giphy.gif',      // frustrated programmer
        'https://media.giphy.com/media/xTiN0L7EW5trfOvEk0/giphy.gif', // debugging stress
        'https://media.giphy.com/media/yYSSBtDgbbRzq/giphy.gif'       // computer problems
      ],
      'coding_celebration': [
        'https://media.giphy.com/media/3owzW5c1tPq63MPmWk/giphy.gif', // chef's kiss success
        'https://media.giphy.com/media/vFKqnCdLPNOKc/giphy.gif',      // approval/thumbs up
        'https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif'   // celebration party
      ],
      'coffee_coding': [
        'https://media.giphy.com/media/KzJkzjggfGN5Py6nkT/giphy.gif', // coffee addiction
        'https://media.giphy.com/media/3o7TKYdGh8KRi4P8xG/giphy.gif', // need more coffee
        'https://media.giphy.com/media/LbfNLRFe2g632/giphy.gif'        // coffee love
      ],
      'perfectionist_code': [
        'https://media.giphy.com/media/5wWf7GR2nhgamhRnEuA/giphy.gif', // clean code satisfaction
        'https://media.giphy.com/media/vFKqnCdLPNOKc/giphy.gif',      // perfectionist approval  
        'https://media.giphy.com/media/3owzW5c1tPq63MPmWk/giphy.gif'   // chef's kiss quality
      ],
      'hacker_typing': [
        'https://media.giphy.com/media/26tn33aiTi1jkl6H6/giphy.gif',  // fast typing
        'https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif',      // intense coding
        'https://media.giphy.com/media/ZVik7pBtu9dNS/giphy.gif'       // hacking/coding
      ],
      'tech_approval': [
        'https://media.giphy.com/media/vFKqnCdLPNOKc/giphy.gif',      // approval nod
        'https://media.giphy.com/media/3owzW5c1tPq63MPmWk/giphy.gif', // chef's kiss
        'https://media.giphy.com/media/5wWf7GR2nhgamhRnEuA/giphy.gif'  // satisfaction
      ]
    }
    
    try {
      const aiResult = await spark.llm(prompt, 'gpt-4o-mini')
      const category = aiResult.trim().toLowerCase()
      
      if (engineeringMemeCategories[category]) {
        const memes = engineeringMemeCategories[category]
        const index = forceNew ? 
          Math.floor(Math.random() * memes.length) : 
          Math.floor(Date.now() / 3600000) % memes.length
        return memes[index]
      }
    } catch (error) {
      console.log('AI category selection failed, using default engineering meme')
    }
    
    // Default to coding celebration for any unknown holiday
    const defaultEngineeringMemes = [
      'https://media.giphy.com/media/26tn33aiTi1jkl6H6/giphy.gif',  // fast typing (productive)
      'https://media.giphy.com/media/vFKqnCdLPNOKc/giphy.gif',      // approval (positive)
      'https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif',      // intense focus (dedicated)
      'https://media.giphy.com/media/3owzW5c1tPq63MPmWk/giphy.gif', // chef's kiss (quality)
      'https://media.giphy.com/media/KzJkzjggfGN5Py6nkT/giphy.gif'  // coffee (relatable)
    ]
    
    const index = forceNew ? 
      Math.floor(Math.random() * defaultEngineeringMemes.length) : 
      Math.floor(Date.now() / 3600000) % defaultEngineeringMemes.length
    return defaultEngineeringMemes[index]
  }

  const loadContent = async (forceRefresh = false) => {
    setIsLoading(true)
    try {
      const holidays = await fetchHolidays()
      const selectedHoliday = await selectBestHoliday(holidays)
      
      setMemeLoading(true)
      const memeUrl = await generateMeme(selectedHoliday, forceRefresh)
      setMemeLoading(false)
      
      const newContent: DailyContent = {
        date: today,
        holiday: selectedHoliday,
        memeUrl
      }
      
      setContent(newContent)
    } catch (error) {
      toast.error('Failed to load holiday content')
      setMemeLoading(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    // Clear existing content to force a fresh meme generation
    setContent(null)
    await loadContent(true) // Force refresh with new meme
    setIsRefreshing(false)
    toast.success('Content refreshed!')
  }

  const handleShare = () => {
    if (!content) return
    
    const shareText = `🎉 Today's Holiday: ${content.holiday.name}\n\nCheck out this celebration! ${content.memeUrl}\n\n#HolidayFun #Engineering`
    
    if (navigator.share) {
      navigator.share({
        title: `Today's Holiday: ${content.holiday.name}`,
        text: shareText
      })
    } else {
      navigator.clipboard.writeText(shareText)
      toast.success('Copied to clipboard!')
    }
  }

  useEffect(() => {
    if (!content || content.date !== today) {
      loadContent()
    }
  }, [])

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Holiday Fun</h1>
          <p className="text-muted-foreground">Daily holiday discoveries for your engineering team</p>
        </header>

        {isLoading ? (
          <Card className="w-full">
            <CardHeader>
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        ) : content ? (
          <Card className="w-full overflow-hidden">
            <CardHeader className="bg-card">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <CardTitle className="text-2xl font-bold text-card-foreground">
                    {content.holiday.name}
                  </CardTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar size={16} />
                    {new Date().toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </div>
                </div>
                <Badge variant="secondary" className="bg-accent text-accent-foreground">
                  Today's Pick
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {content.holiday.description && (
                <p className="text-foreground">{content.holiday.description}</p>
              )}
              
              {content.holiday.reason && (
                <div className="bg-secondary/50 p-4 rounded-lg">
                  <p className="text-sm text-secondary-foreground">
                    <strong>Why this holiday?</strong> {content.holiday.reason}
                  </p>
                </div>
              )}

              <div className="bg-muted border-2 border-dashed border-border rounded-lg overflow-hidden">
                <div className="p-4 border-b border-border">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium text-center">
                    Engineering Team Meme
                  </div>
                </div>
                <div className="aspect-video bg-card flex items-center justify-center">
                  {memeLoading ? (
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw size={24} className="animate-spin text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Loading meme...</span>
                    </div>
                  ) : (
                    <img 
                      src={content.memeUrl} 
                      alt={`${content.holiday.name} meme`}
                      className="max-w-full max-h-full object-contain rounded"
                      onError={(e) => {
                        // Fallback to engineering-themed meme if the image fails to load
                        (e.target as HTMLImageElement).src = 'https://media.giphy.com/media/26tn33aiTi1jkl6H6/giphy.gif' // fast typing
                      }}
                    />
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  onClick={handleRefresh} 
                  disabled={isRefreshing}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                  {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </Button>
                <Button 
                  onClick={handleShare}
                  className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
                  size="sm"
                >
                  <Share2 size={16} />
                  Share
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <footer className="text-center text-xs text-muted-foreground">
          designed by humans, built by AI
        </footer>
      </div>
      <Toaster />
    </div>
  )
}

export default App