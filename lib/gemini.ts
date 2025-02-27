import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the Google Generative AI with your API key
export const initGemini = () => {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error("Gemini API key is missing. Please add it to your .env.local file.");
    return null;
  }
  
  return new GoogleGenerativeAI(apiKey);
};

// Function to generate text with Gemini
export const generateText = async (prompt: string, model = "gemini-2.0-flash-001") => {
  try {
    const genAI = initGemini();
    
    if (!genAI) {
      console.error("Gemini API not initialized - check your API key");
      return "AI service is currently unavailable. Please check your API key configuration.";
    }
    
    // Add markdown formatting instructions to the prompt
    const enhancedPrompt = `
      ${prompt}
      
      Format your response using markdown with:
      - Section headings (### Title)
      - Bullet points (* Item)
      - Bold text (**important**)
    `;
    
    console.log(`Sending request to Gemini API using model: ${model}...`);
    const geminiModel = genAI.getGenerativeModel({ model });
    
    try {
      const result = await geminiModel.generateContent(enhancedPrompt);
      const response = await result.response;
      return response.text();
    } catch (apiError: unknown) {
      console.error("Gemini API error:", apiError);
      
      // Type guard to check if apiError is an object with a message property
      if (apiError && typeof apiError === 'object' && 'message' in apiError && typeof apiError.message === 'string') {
        if (apiError.message.includes("quota")) {
          return "API quota exceeded. Please try again later.";
        } else if (apiError.message.includes("blocked")) {
          return "The request was blocked by content filters. Please modify your query.";
        } else if (apiError.message.includes("model not found")) {
          // Try fallback to an older model
          console.log("Model not found, trying fallback model...");
          return generateText(prompt, "gemini-1.5-pro");
        }
      }
      return "Sorry, I couldn't generate a response. Please try a simpler query or try again later.";
    }
  } catch (error) {
    console.error("Error generating text with Gemini:", error);
    // Return a user-friendly error message
    return "An unexpected error occurred. Please try again later.";
  }
};

// Function to analyze subscription data
export const analyzeSubscriptions = async (subscriptions: any[]) => {
  try {
    const prompt = `
      Analyze the following subscription data and provide insights:
      ${JSON.stringify(subscriptions, null, 2)}
      
      Please provide:
      1. Key trends in subscription patterns
      2. Recommendations for improving renewal rates
      3. Potential revenue optimization strategies
      4. Any concerning patterns that need attention
    `;
    
    return await generateText(prompt);
  } catch (error) {
    console.error("Error analyzing subscriptions:", error);
    throw error;
  }
};

// Function to generate payment reminder messages
export const generatePaymentReminder = async (
  subscriberName: string, 
  daysOverdue: number, 
  amount: number,
  currency: string = "PKR"
) => {
  try {
    const prompt = `
      Generate a polite but firm payment reminder message for a streaming service subscription.
      
      Details:
      - Subscriber name: ${subscriberName}
      - Days overdue: ${daysOverdue}
      - Amount due: ${currency} ${amount}
      
      The tone should be professional but friendly. Include a clear call to action.
      Keep it concise (under 100 words).
    `;
    
    return await generateText(prompt);
  } catch (error) {
    console.error("Error generating payment reminder:", error);
    throw error;
  }
};

/**
 * Analyze payment history and provide insights
 */
export const analyzePaymentHistory = async (
  subscriberName: string,
  paymentHistory: any[],
  totalPaid: number,
  totalDue: number
) => {
  try {
    const prompt = `
      Analyze this subscriber's payment history and provide insights:
      
      Subscriber: ${subscriberName}
      Total paid to date: PKR ${totalPaid}
      Total due: PKR ${totalDue}
      Remaining to be paid: PKR ${Math.max(0, totalDue - totalPaid)}
      
      Payment history:
      ${JSON.stringify(paymentHistory, null, 2)}
      
      Important context:
      - We do NOT offer free trials
      - All subscriptions require payment
      - "unpaid" status means the customer has not paid yet
      - "paid" status means the customer has paid
      
      Please provide:
      1. A summary of their payment behavior (are they paying on time, late, or not at all?)
      2. Any concerning patterns in their payment history
      3. Recommendations for improving payment collection
      4. A personalized message to include when requesting payment
      
      Structure your response with clear markdown headings (### Section Title) and bullet points (* Point).
      Ensure there is a blank line before and after headings and lists.
      Keep it concise and actionable (under 150 words).
    `;
    
    return await generateText(prompt);
  } catch (error) {
    console.error("Error analyzing payment history:", error);
    return "Unable to analyze payment history at this time.";
  }
}; 