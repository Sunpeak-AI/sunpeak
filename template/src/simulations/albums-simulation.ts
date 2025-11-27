import type { ToolConfig } from './types';

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

export const albumsSimulationConfig: ToolConfig = {
  value: 'albums',
  label: 'Albums',
  userMessage: 'Pizza time',
  mcpToolOutput: albumsData,
  mcpToolListMetadata: {
    'openai/outputTemplate': 'ui://widget/album.html',
    'openai/toolInvocation/invoking': 'Loading albums',
    'openai/toolInvocation/invoked': 'Album loaded',
    'openai/widgetAccessible': true,
    'openai/resultCanProduceWidget': true,
  },
  mcpToolCallMetadata: {},
  mcpResourceURI: 'ui://widget/album.html',
  toolDescription: 'Show photo albums',
};
