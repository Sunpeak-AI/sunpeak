/**
 * Server-safe configuration for the albums simulation.
 * This file contains only metadata and doesn't import React components or CSS.
 */

const albumsData = {
  albums: [
    {
      id: "summer-escape",
      title: "Summer Slice",
      cover: "https://persistent.oaistatic.com/pizzaz/pizzaz-1.png",
      photos: [
        {
          id: "s1",
          title: "Waves",
          url: "https://persistent.oaistatic.com/pizzaz/pizzaz-2.png"
        },
        {
          id: "s2",
          title: "Palm trees",
          url: "https://persistent.oaistatic.com/pizzaz/pizzaz-3.png"
        },
        {
          id: "s3",
          title: "Sunset",
          url: "https://persistent.oaistatic.com/pizzaz/pizzaz-6.png"
        }
      ]
    },
    {
      id: "city-lights",
      title: "Pepperoni Nights",
      cover: "https://persistent.oaistatic.com/pizzaz/pizzaz-4.png",
      photos: [
        {
          id: "c1",
          title: "Downtown",
          url: "https://persistent.oaistatic.com/pizzaz/pizzaz-5.png"
        },
        {
          id: "c2",
          title: "Neon",
          url: "https://persistent.oaistatic.com/pizzaz/pizzaz-1.png"
        },
        {
          id: "c3",
          title: "Streets",
          url: "https://persistent.oaistatic.com/pizzaz/pizzaz-2.png"
        }
      ]
    },
    {
      id: "into-the-woods",
      title: "Truffle Forest",
      cover: "https://persistent.oaistatic.com/pizzaz/pizzaz-3.png",
      photos: [
        {
          id: "n1",
          title: "Forest path",
          url: "https://persistent.oaistatic.com/pizzaz/pizzaz-6.png"
        },
        {
          id: "n2",
          title: "Misty",
          url: "https://persistent.oaistatic.com/pizzaz/pizzaz-4.png"
        },
        {
          id: "n3",
          title: "Waterfall",
          url: "https://persistent.oaistatic.com/pizzaz/pizzaz-5.png"
        }
      ]
    },
    {
      id: "pizza-tour",
      title: "Pizza tour",
      cover: "https://persistent.oaistatic.com/pizzaz/pizzaz-1.png",
      photos: [
        {
          id: "tonys-pizza-napoletana",
          title: "Tony's Pizza Napoletana",
          url: "https://persistent.oaistatic.com/pizzaz/pizzaz-2.png"
        },
        {
          id: "golden-boy-pizza",
          title: "Golden Boy Pizza",
          url: "https://persistent.oaistatic.com/pizzaz/pizzaz-3.png"
        },
        {
          id: "pizzeria-delfina-mission",
          title: "Pizzeria Delfina (Mission)",
          url: "https://persistent.oaistatic.com/pizzaz/pizzaz-6.png"
        },
        {
          id: "ragazza",
          title: "Ragazza",
          url: "https://persistent.oaistatic.com/pizzaz/pizzaz-4.png"
        },
        {
          id: "del-popolo",
          title: "Del Popolo",
          url: "https://persistent.oaistatic.com/pizzaz/pizzaz-5.png"
        },
        {
          id: "square-pie-guys",
          title: "Square Pie Guys",
          url: "https://persistent.oaistatic.com/pizzaz/pizzaz-1.png"
        },
        {
          id: "zero-zero",
          title: "Zero Zero",
          url: "https://persistent.oaistatic.com/pizzaz/pizzaz-2.png"
        }
      ]
    }
  ]
};

export const albumsSimulation = {
  userMessage: 'Pizza time',

  // MCP Tool protocol - official Tool type from MCP SDK used in ListTools response
  tool: {
    name: 'show-albums',
    description: 'Show photo albums',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false } as const,
    title: 'Show Albums',
    annotations: { readOnlyHint: true },
    _meta: {
      'openai/outputTemplate': 'ui://widget/album.html',
      'openai/toolInvocation/invoking': 'Loading albums',
      'openai/toolInvocation/invoked': 'Album loaded',
      'openai/widgetAccessible': true,
      'openai/resultCanProduceWidget': true,
    },
  },

  // MCP Resource protocol - official Resource type from MCP SDK used in ListResources response
  // resource.name is used as the simulation identifier
  // resource.title is used as the simulation display label
  resource: {
    uri: 'ui://widget/album.html',
    name: 'albums',
    title: 'Albums',
    description: 'Show photo albums widget markup',
    mimeType: 'text/html+skybridge',
    _meta: {},
  },

  // MCP CallTool protocol - data for CallTool response
  toolCall: {
    structuredContent: albumsData,
    _meta: {},
  },
} as const;
