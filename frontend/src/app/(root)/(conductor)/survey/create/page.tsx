// app/survey_create/page.tsx

"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import type { CheckedState } from "@radix-ui/react-checkbox";
import { Loader2, Save, X, Upload, FileImage } from "lucide-react";
import { useEffect, useState, useRef, useCallback } from "react";
import * as Papa from "papaparse";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { debounce } from 'perfect-debounce';
import { useAuth } from "@/context/AuthContext";

// Type definitions
interface Question {
    id: string;
    text: string;
    type: "multiple-choice" | "single-choice" | "text" | "rating";
    options: Array<{ id: string; text: string }>;
    mandatory: boolean;
    correctAnswers?: string;
    mediaFiles?: Array<{
        id: string;
        url: string;
        type: string;
        status: 'UPLOADING' | 'READY' | 'ERROR';
    }>;
}

interface DraftQuestion {
    question_id: number;
    tempId?: string;
    question_text: string;
    question_type: string;
    mandatory: boolean;
    branching_logic: string;
    correct_answers?: string;
    mediaFiles?: Array<{
        mediaId: number;
        fileUrl: string;
        fileType: string;
        status: 'UPLOADING' | 'READY' | 'ERROR';
    }>;
}

interface DraftOption {
    optionId: string;
    question_id: number;
    questionTempId?: string;
    option_text: string;
}

interface SurveyDraft {
    draftId?: number;
    surveyId?: number;
    draftContent: {
        basicInfo: {
            title: string;
            description: string;
            is_self_recruitment: boolean;
            conductor_id: number;
            status: string;
        };
        questions: Array<DraftQuestion>;
        options: Array<DraftOption>;
    };
    lastSaved: string;
    lastEditedQuestion?: string;
}

// Type for parsed draft data from localStorage
interface ParsedDraftQuestion {
    question_id?: number;
    tempId?: string;
    question_text: string;
    question_type: string;
    mandatory: boolean;
    branching_logic: string;
    correct_answers?: string;
    options?: string[];
    mediaFiles?: Array<{
        mediaId: number;
        fileUrl: string;
        fileType: string;
        status: 'UPLOADING' | 'READY' | 'ERROR';
    }>;
}

interface ParsedDraftOption {
    optionId: string;
    question_id?: number;
    questionTempId?: string;
    option_text: string;
}

// Type for server response
interface ServerResponse {
    data?: {
        draftId?: number;
        surveyId?: number;
    };
    draftId?: number;
    surveyId?: number;
    [key: string]: unknown;
}

const STORAGE_KEY = 'currentSurveyDraft';
const BACKUP_KEY = `${STORAGE_KEY}-backup`;
const API_BASE_URL = process.env.NEXT_PUBLIC_AUTH_API_URL?.replace('/api/auth', '') || 'http://localhost:5171'; // Auth service base URL

// Type for window with requestIdleCallback support
type WindowWithIdleCallback = Window & {
    requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
};

export default function SurveyCreatePage() {
    // Top-level templates object for SmartSurvey-style templates
const templates: Record<string, any> = {
  "product-feedback": {
    type: "survey",
    title: "Product Feedback Form",
    description: "Gather information about customers' experiences and opinions of a particular product.",
    questions: [
      { id: "1", text: "What is your age?", type: "single-choice", options: [ { id: "a", text: "Under 18" }, { id: "b", text: "18-24" }, { id: "c", text: "25-34" }, { id: "d", text: "35-44" }, { id: "e", text: "45-54" }, { id: "f", text: "55-64" }, { id: "g", text: "65 or older" } ], mandatory: true },
      { id: "2", text: "What is your gender?", type: "single-choice", options: [ { id: "a", text: "Male" }, { id: "b", text: "Female" }, { id: "c", text: "Non-binary" }, { id: "d", text: "Prefer not to say" } ], mandatory: true },
      { id: "3", text: "Which of the following best describes your employment status?", type: "single-choice", options: [ { id: "a", text: "Full-time employee" }, { id: "b", text: "Part-time employee" }, { id: "c", text: "Self-employed" }, { id: "d", text: "Student" }, { id: "e", text: "Retired" }, { id: "f", text: "Unemployed" } ], mandatory: true },
      { id: "4", text: "How often do you use our product?", type: "single-choice", options: [ { id: "a", text: "Daily" }, { id: "b", text: "Weekly" }, { id: "c", text: "Monthly" }, { id: "d", text: "Rarely" }, { id: "e", text: "First time user" } ], mandatory: true },
      { id: "5", text: "How would you rate the ease of use of our product?", type: "single-choice", options: [ { id: "a", text: "Very easy" }, { id: "b", text: "Somewhat easy" }, { id: "c", text: "Neutral" }, { id: "d", text: "Somewhat difficult" }, { id: "e", text: "Very difficult" } ], mandatory: true },
      { id: "6", text: "Which of the following features do you find most useful? (select all that apply)", type: "multiple-choice", options: [ { id: "a", text: "Feature 1" }, { id: "b", text: "Feature 2" }, { id: "c", text: "Feature 3" }, { id: "d", text: "Feature 4" }, { id: "e", text: "Feature 5" } ], mandatory: false },
      { id: "7", text: "Is there a feature you wish our product had?", type: "single-choice", options: [ { id: "a", text: "Yes" }, { id: "b", text: "No" } ], mandatory: false },
      { id: "8", text: "Have you ever had to contact customer support for our product?", type: "single-choice", options: [ { id: "a", text: "Yes" }, { id: "b", text: "No" } ], mandatory: false },
      { id: "9", text: "How would you rate the customer support you received?", type: "single-choice", options: [ { id: "a", text: "Excellent" }, { id: "b", text: "Good" }, { id: "c", text: "Fair" }, { id: "d", text: "Poor" }, { id: "e", text: "N/A" } ], mandatory: false },
      { id: "10", text: "Was your issue resolved in a timely manner?", type: "single-choice", options: [ { id: "a", text: "Yes" }, { id: "b", text: "No" } ], mandatory: false },
      { id: "11", text: "How satisfied are you with our product?", type: "single-choice", options: [ { id: "a", text: "Very satisfied" }, { id: "b", text: "Somewhat satisfied" }, { id: "c", text: "Neutral" }, { id: "d", text: "Somewhat dissatisfied" }, { id: "e", text: "Very dissatisfied" } ], mandatory: true },
      { id: "12", text: "Would you recommend our product to others?", type: "single-choice", options: [ { id: "a", text: "Yes" }, { id: "b", text: "No" } ], mandatory: true },
      { id: "13", text: "How likely are you to continue using our product in the future?", type: "single-choice", options: [ { id: "a", text: "Very likely" }, { id: "b", text: "Somewhat likely" }, { id: "c", text: "Neutral" }, { id: "d", text: "Somewhat unlikely" }, { id: "e", text: "Very unlikely" } ], mandatory: true }
    ]
  },
  "customer-satisfaction": {
    type: "survey",
    title: "Customer Satisfaction Survey",
    description: "Measure customer satisfaction and identify areas for improvement.",
    questions: [
      { id: "1", text: "How satisfied are you with our product/service?", type: "rating", options: [], mandatory: true },
      { id: "2", text: "What did you like most about our product/service?", type: "text", options: [], mandatory: false },
      { id: "3", text: "What can we improve?", type: "text", options: [], mandatory: false },
      { id: "4", text: "Would you recommend us to others?", type: "single-choice", options: [ { id: "a", text: "Yes" }, { id: "b", text: "No" } ], mandatory: true }
    ]
  },
  "employee-engagement": {
    type: "survey",
    title: "Employee Engagement Survey",
    description: "Understand employee motivation, satisfaction, and workplace culture.",
    questions: [
      { id: "1", text: "How engaged do you feel at work?", type: "rating", options: [], mandatory: true },
      { id: "2", text: "What motivates you at work?", type: "text", options: [], mandatory: false },
      { id: "3", text: "Do you feel valued by your manager?", type: "single-choice", options: [ { id: "a", text: "Yes" }, { id: "b", text: "No" } ], mandatory: true },
      { id: "4", text: "What could improve your engagement?", type: "text", options: [], mandatory: false }
    ]
  },
  "event-feedback": {
    type: "survey",
    title: "Event Feedback Survey",
    description: "Collect feedback from attendees to improve future events.",
    questions: [
      { id: "1", text: "How would you rate the event overall?", type: "rating", options: [], mandatory: true },
      { id: "2", text: "What did you enjoy most about the event?", type: "text", options: [], mandatory: false },
      { id: "3", text: "What could be improved for next time?", type: "text", options: [], mandatory: false },
      { id: "4", text: "Would you attend future events?", type: "single-choice", options: [ { id: "a", text: "Yes" }, { id: "b", text: "No" } ], mandatory: true }
    ]
  },
  "market-research": {
    type: "survey",
    title: "Market Research Survey",
    description: "Gather insights about your target market and customer preferences.",
    questions: [
      { id: "1", text: "How did you hear about us?", type: "single-choice", options: [ { id: "a", text: "Online" }, { id: "b", text: "Friend" }, { id: "c", text: "Advertisement" }, { id: "d", text: "Other" } ], mandatory: true },
      { id: "2", text: "What features are most important to you?", type: "multiple-choice", options: [ { id: "a", text: "Price" }, { id: "b", text: "Quality" }, { id: "c", text: "Support" }, { id: "d", text: "Brand" } ], mandatory: false },
      { id: "3", text: "Any other comments?", type: "text", options: [], mandatory: false }
    ]
  },
  "general-quiz": {
    type: "quiz",
    title: "General Knowledge Quiz",
    description: "Test your knowledge with these quiz questions.",
    questions: [
      { id: "1", text: "What is the capital of France?", type: "single-choice", options: [ { id: "a", text: "Paris" }, { id: "b", text: "London" }, { id: "c", text: "Berlin" } ], mandatory: true, correctAnswers: "Paris" },
      { id: "2", text: "2 + 2 = ?", type: "single-choice", options: [ { id: "a", text: "3" }, { id: "b", text: "4" }, { id: "c", text: "5" } ], mandatory: true, correctAnswers: "4" }
    ]
  }
};
    // Survey type selection
    const [selectedType, setSelectedType] = useState<string>("");
    // CSV import state
    const [csvPreview, setCsvPreview] = useState<any[]>([]);
    const [csvError, setCsvError] = useState<string>("");
    const router = useRouter();
    const { user, isAuthenticated, loading } = useAuth();
    
    const [isLoading, setIsLoading] = useState(false);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentSection, setCurrentSection] = useState<'basic' | 'questions' | 'branching'>('basic');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [lastSynced, setLastSynced] = useState<Date | null>(null);
    const [conductorInfo, setConductorInfo] = useState<{ conductorId: number } | null>(null);
    
    // Initialize draft state
    const [draft, setDraft] = useState<SurveyDraft>({
        draftContent: {
            basicInfo: {
                title: '',
                description: '',
                is_self_recruitment: false,
                status: 'DRAFT',
                conductor_id: 0 // Will be set after loading conductor info
            },
            questions: [],
            options: []
        },
        lastSaved: new Date().toISOString()
    });

    // Track if a sync is in progress
    const isSyncingRef = useRef(false);
    // Track the latest draft that needs to be synced
    const pendingDraftRef = useRef<SurveyDraft | null>(null);

    // Utility function to save to localStorage without triggering sync
    const saveToLocalStorage = (draftToSave: SurveyDraft, key = STORAGE_KEY) => {
        try {
            // Use requestIdleCallback for non-critical operations when browser is idle
            // Fall back to setTimeout with zero delay if requestIdleCallback isn't available
            const saveOperation = () => {
                const serialized = JSON.stringify(draftToSave);
                
                // Check size before saving
                if (serialized.length > 4 * 1024 * 1024) { // 4MB safety threshold
                    toast.warning("Draft is getting large, consider publishing soon");
                }
                
                localStorage.setItem(key, serialized);
            };
            
            if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
                (window as WindowWithIdleCallback).requestIdleCallback?.(saveOperation, { timeout: 1000 });
            } else {
                setTimeout(saveOperation, 0);
            }
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            toast.error("Failed to save draft locally");
        }
    };


    // Function to find draft ID in server response
    const findDraftIdInResponse = (obj: ServerResponse): number | null => {
        if (!obj || typeof obj !== 'object') return null;
        
        // Direct check for draftId (case sensitive and insensitive)
        if ('draftId' in obj && typeof obj.draftId === 'number') return obj.draftId;
        if ('draft_id' in obj && typeof obj.draft_id === 'number') return obj.draft_id as number;
        
        // Search for any property containing 'draft' and 'id'
        for (const key in obj) {
            const lowerKey = key.toLowerCase();
            if (lowerKey.includes('draft') && lowerKey.includes('id') && typeof obj[key] === 'number') {
                return obj[key] as number;
            }
            
            if (typeof obj[key] === 'object' && obj[key] !== null) {
                const found = findDraftIdInResponse(obj[key] as ServerResponse);
                if (found) return found;
            }
        }
        return null;
    };

    // Sync with backend
    const syncWithBackend = async (draftData: SurveyDraft) => {
        // Don't sync if there's no meaningful content
        if (!draftData.draftContent.basicInfo.title && draftData.draftContent.questions.length === 0) {
            return;
        }
        
        // Check localStorage for draftId if not present in current data
        let validDraftId = null;
        if (!draftData.draftId) {
            const savedDraft = localStorage.getItem(STORAGE_KEY);
            if (savedDraft) {
                try {
                    const parsed = JSON.parse(savedDraft);
                    if (parsed.draftId) {
                        console.log(`Retrieved draftId ${parsed.draftId} from localStorage`);
                        validDraftId = parsed.draftId;
                        draftData.draftId = validDraftId;
                    }
                } catch (e) {
                    console.error('Error parsing localStorage draft:', e);
                }
            }
        } else {
            validDraftId = draftData.draftId;
        }
        
        // Create a question ID mapping for normalization
        const questionIdMap = new Map<number, number>();
        
        // Assign sequential IDs to questions
        draftData.draftContent.questions.forEach((question, index) => {
            const originalId = question.question_id;
            const normalizedId = index + 1; // Start with 1
            if (originalId !== undefined) {
                questionIdMap.set(originalId, normalizedId);
            }
        });
        
        // Transform data to match backend schema
        const transformedContent = {
            basicInfo: {
                title: draftData.draftContent.basicInfo.title,
                description: draftData.draftContent.basicInfo.description,
                is_self_recruitment: draftData.draftContent.basicInfo.is_self_recruitment,
                status: draftData.draftContent.basicInfo.status,
                conductor_id: draftData.draftContent.basicInfo.conductor_id
            },
            questions: draftData.draftContent.questions.map((q, index) => ({
                question_id: index + 1, // Use normalized ID
                question_text: q.question_text,
                question_type: q.question_type,
                mandatory: q.mandatory,
                branching_logic: q.branching_logic,
                correct_answers: q.correct_answers || ""
            })),
            options: draftData.draftContent.options.map(opt => ({
                option_text: opt.option_text,
                question_id: questionIdMap.get(opt.question_id) || 1 // Use normalized question ID
            })),
            mediaFiles: draftData.draftContent.questions.flatMap(q => 
                (q.mediaFiles || []).map(m => ({
                    question_id: questionIdMap.get(q.question_id) || 1, // Use normalized question ID
                    file_url: m.fileUrl,
                    file_type: m.fileType
                }))
            )
        };

        // Log normalized mappings for debugging
        console.log('Question ID normalization map:', Object.fromEntries(questionIdMap));
        console.log('Normalized options:', transformedContent.options);

        try {
            // Verify if the draft actually exists on the backend before deciding on PUT vs POST
            let method = 'POST';
            let endpoint = `${API_BASE_URL}/api/SurveyProxy/drafts`;
            
            // Only use PUT if we have a valid draft ID that was previously saved
            if (validDraftId) {
                try {
                    // First try with HEAD request (lightweight)
                    let checkResponse = await fetch(`${API_BASE_URL}/api/SurveyProxy/drafts/${validDraftId}`, {
                        method: 'HEAD',
                        credentials: 'include'
                    });
                    
                    // If HEAD method is not supported, fall back to GET
                    if (checkResponse.status === 405) { // Method Not Allowed
                        console.log('HEAD method not supported, falling back to GET');
                        checkResponse = await fetch(`${API_BASE_URL}/api/SurveyProxy/drafts/${validDraftId}`, {
                            method: 'GET',
                            credentials: 'include'
                        });
                    }
                    
                    if (checkResponse.ok) {
                        method = 'PUT';
                        endpoint = `${API_BASE_URL}/api/SurveyProxy/drafts/${validDraftId}`;
                        console.log(`Draft with ID ${validDraftId} exists, using PUT method`);
                    } else {
                        console.log(`Draft with ID ${validDraftId} does not exist (status: ${checkResponse.status}), using POST method`);
                        // Reset the draftId since it doesn't exist on the server
                        draftData.draftId = undefined;
                    }
                } catch (error) {
                    console.error('Error checking if draft exists:', error);
                    console.log('Falling back to POST method');
                    // Reset the draftId since we couldn't verify it
                    draftData.draftId = undefined;
                }
            } else {
                console.log('No valid draft ID found, using POST method');
            }
            
            console.log(`Syncing with method: ${method}, endpoint: ${endpoint}`);
            console.log('Draft data being sent:', JSON.stringify(transformedContent, null, 2));
            
            const requestBody = {
                survey_id: 0, // 0 indicates this is a new survey, not editing an existing one
                draft_content: transformedContent,
                last_edited_question: draftData.lastEditedQuestion ? parseInt(draftData.lastEditedQuestion) : 0,
                draft_id: validDraftId || undefined // Initialize with value or undefined
            };
            
            const headers: Record<string, string> = { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            };
            
            console.log('Request headers:', headers);
            console.log('Full request body:', JSON.stringify(requestBody, null, 2));
            
            const response = await fetch(endpoint, {
                method: method,
                headers: headers,
                credentials: 'include', // Include cookies for authentication
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                console.error('Response not OK:', {
                    status: response.status,
                    statusText: response.statusText,
                    url: response.url
                });
                
                // Try to get the error response body
                let errorBody = '';
                try {
                    errorBody = await response.text();
                    console.error('Error response body:', errorBody);
                } catch (e) {
                    console.error('Could not read error response body:', e);
                }
                
                throw new Error(`Failed to sync with server: ${response.status} ${response.statusText} - ${errorBody}`);
            }

            const result: ServerResponse = await response.json();
            console.log('Server response:', result);
            console.log('Response data.draftId:', result.data?.draftId);
            
            // Deep debug the server response structure
            console.log('Response structure:', {
                hasDataProperty: 'data' in result,
                dataType: typeof result.data,
                dataKeys: result.data ? Object.keys(result.data) : 'no data object',
                draftIdInData: result.data && 'draftId' in result.data
            });
            
            // Simplified draftId detection - directly access the expected path first
            let draftIdFromResponse = null;
            
            // Direct access to the expected structure based on your server response
            if (result.data && typeof result.data === 'object' && result.data.draftId) {
                draftIdFromResponse = result.data.draftId;
                console.log('Found draftId in result.data:', draftIdFromResponse);
            } 
            // Fallback to top level
            else if (result.draftId) {
                draftIdFromResponse = result.draftId;
                console.log('Found draftId in top level result:', draftIdFromResponse);
            }
            // Fallback to deep search only if needed
            else {
                console.log('Searching for draftId in response...');
                draftIdFromResponse = findDraftIdInResponse(result);
                if (draftIdFromResponse) {
                    console.log('Found draftId in nested structure:', draftIdFromResponse);
                }
            }
            
            // If we found a draftId, use it - this is executed regardless of finding method
            if (draftIdFromResponse) {
                const updatedDraft = {
                    ...draftData,
                    draftId: draftIdFromResponse,
                    lastSaved: new Date().toISOString()
                };
                
                console.log('Updated draft with draftId:', updatedDraft.draftId);
                
                // Save to localStorage immediately to ensure draftId persistence
                saveToLocalStorage(updatedDraft);
                
                // Update state
                setDraft(updatedDraft);
                setLastSynced(new Date());
                
                return updatedDraft;
            }
            
            // If this was a POST request and we still don't have a draftId, that's an error
            if (method === 'POST' && !draftIdFromResponse) {
                console.error('Server did not return draftId for POST request');
                console.error('Full server response:', JSON.stringify(result, null, 2));
                console.error('Response status:', response.status);
                console.error('Response has draftId in expected location:', !!result.data?.draftId);
                throw new Error('Server did not return draftId for POST request');
            }

            // This code only executes for PUT requests that didn't return a new draftId
            // It's a fallback to use the existing draftId and still update the lastSaved timestamp
            const updatedDraft = {
                ...draftData,
                draftId: draftIdFromResponse || draftData.draftId,
                lastSaved: new Date().toISOString()
            };
            
            console.log('Updated draft with server response:', updatedDraft);
            
            // Save to localStorage immediately to ensure draftId persistence
            saveToLocalStorage(updatedDraft);
            
            // Update state
            setDraft(updatedDraft);
            setLastSynced(new Date());
            
            return updatedDraft;
        } catch (error) {
            console.error('Sync failed:', error);
            toast.error("Failed to sync with server. Will retry automatically.");
            
            // Simple retry logic (up to 2 retries with exponential backoff)
            for (let i = 0; i < 2; i++) {
                await new Promise(resolve => setTimeout(resolve, 2000 * Math.pow(2, i)));
                
                try {
                    const retryMethod = draftData.draftId ? 'PUT' : 'POST';
                    const retryEndpoint = draftData.draftId 
                        ? `${API_BASE_URL}/api/SurveyProxy/drafts/${draftData.draftId}`
                        : `${API_BASE_URL}/api/SurveyProxy/drafts`;
                        
                    const retryResponse = await fetch(retryEndpoint, {
                        method: retryMethod,
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        credentials: 'include',
                        body: JSON.stringify({
                            survey_id: 0, // 0 indicates this is a new survey
                            draft_content: transformedContent,
                            last_edited_question: draftData.lastEditedQuestion ? parseInt(draftData.lastEditedQuestion) : 0
                        })
                    });

                    if (retryResponse.ok) {
                        const retryResult: ServerResponse = await retryResponse.json();
                        console.log('Retry result:', retryResult);
                        
                        // Find draftId using the same robust approach as the main function
                        let retryDraftId = null;
                        
                        // Direct access to the expected structure
                        if (retryResult.data && typeof retryResult.data === 'object' && retryResult.data.draftId) {
                            retryDraftId = retryResult.data.draftId;
                            console.log('Found retry draftId in result.data:', retryDraftId);
                        } 
                        // Fallback to top level
                        else if (retryResult.draftId) {
                            retryDraftId = retryResult.draftId;
                            console.log('Found retry draftId at top level:', retryDraftId);
                        }
                        // Deep search as last resort
                        else {
                            retryDraftId = findDraftIdInResponse(retryResult);
                        }
                        
                        if (!retryDraftId && retryMethod === 'POST') {
                            console.error('Server did not return draftId for retry POST request');
                            continue; // Try next retry
                        }
                        
                        // Update draft with the returned draftId and immediately save to localStorage
                        const updatedDraft = {
                            ...draftData,
                            draftId: retryDraftId || draftData.draftId,
                            lastSaved: new Date().toISOString()
                        };
                        
                        // Save to localStorage immediately to ensure draftId persistence
                        saveToLocalStorage(updatedDraft);
                        
                        // Update state
                        setDraft(updatedDraft);
                        setLastSynced(new Date());
                        
                        toast.success("Sync succeeded after retry");
                        return updatedDraft;
                    }
                } catch (retryError) {
                    console.error(`Retry ${i + 1} failed:`, retryError);
                }
            }
            
            toast.error("Sync failed after retries. Changes saved locally only.");
            throw error;
        }
    };

    // Function to process any pending drafts
    const processPendingDraft = useCallback(async () => {
        if (pendingDraftRef.current && !isSyncingRef.current) {
            isSyncingRef.current = true;
            try {
                // Ensure we use the latest draftId from state or localStorage
                const latestDraft = {
                    ...pendingDraftRef.current,
                    draftId: pendingDraftRef.current.draftId || draft.draftId
                };
                
                await syncWithBackend(latestDraft);
                pendingDraftRef.current = null;
            } finally {
                isSyncingRef.current = false;
                // Check if another draft was queued while we were syncing
                if (pendingDraftRef.current) {
                    processPendingDraft();
                }
            }
        }
    }, [draft.draftId]);

    // Create a stable debounced function that will queue drafts for syncing
    const queueDraftForSync = useRef(
        debounce((draftData: SurveyDraft) => {
            // Use requestAnimationFrame to schedule intensive work during idle time
            requestAnimationFrame(() => {
                // Make a deep copy to ensure we use the latest data
                pendingDraftRef.current = { ...draftData };
                processPendingDraft();
            });
        }, 5000)
    ).current;
    
    // Clean up debounced function on unmount
    useEffect(() => {
        return () => {
            // The perfect-debounce library doesn't expose a cancel method directly on the type
            // but it does exist at runtime, so we need to use this approach
            const debouncedFn = queueDraftForSync as { cancel?: () => void };
            if (debouncedFn && typeof debouncedFn.cancel === 'function') {
                debouncedFn.cancel();
            }
        };
    }, [queueDraftForSync]);

    // Create a backup of the draft periodically
    useEffect(() => {
        const interval = setInterval(() => {
            if (draft.draftId) {
                saveToLocalStorage(draft, BACKUP_KEY);
            }
        }, 5 * 60 * 1000); // Every 5 minutes
        
        return () => clearInterval(interval);
    }, [draft]);

    // Load draft from localStorage on mount
    useEffect(() => {
        try {
            // Try to load from localStorage
            const savedDraft = localStorage.getItem(STORAGE_KEY);
            if (savedDraft) {
                const parsed = JSON.parse(savedDraft);
                console.log("Loaded draft from localStorage:", parsed);
                if (parsed.draftId) {
                    console.log("Draft ID from localStorage:", parsed.draftId);
                }
                
                // If the old format doesn't have options array, create it
                if (!parsed.draftContent.options) {
                    parsed.draftContent.options = [];
                    
                    // Move options from questions to the separate array
                    parsed.draftContent.questions.forEach((q: ParsedDraftQuestion) => {
                        if (q.options) {
                            // Handle both old format (tempId) and new format (question_id)
                            const questionId = q.question_id || parseInt(q.tempId || "0");
                            q.options.forEach((optText: string, idx: number) => {
                                parsed.draftContent.options.push({
                                    optionId: `${questionId}-opt-${idx}`,
                                    question_id: questionId,
                                    option_text: optText
                                });
                            });
                            // Remove options from question object
                            delete q.options;
                        }
                        
                        // Convert any tempId to question_id if needed
                        if (q.tempId && !q.question_id) {
                            q.question_id = parseInt(q.tempId) || q.question_id;
                            delete q.tempId;
                        }
                    });
                }
                
                // Convert any remaining tempId to question_id in questions array
                if (parsed.draftContent.questions.length > 0) {
                    parsed.draftContent.questions = parsed.draftContent.questions.map((q: ParsedDraftQuestion, index: number) => {
                        if (q.tempId && !q.question_id) {
                            return {
                                ...q,
                                question_id: parseInt(q.tempId) || index + 1,
                                tempId: undefined
                            };
                        }
                        return q;
                    });
                }
                
                // Convert any questionTempId to question_id in options array
                if (parsed.draftContent.options.length > 0) {
                    parsed.draftContent.options = parsed.draftContent.options.map((opt: ParsedDraftOption) => {
                        if (opt.questionTempId && !opt.question_id) {
                            return {
                                ...opt,
                                question_id: parseInt(opt.questionTempId) || 0,
                                questionTempId: undefined
                            };
                        }
                        return opt;
                    });
                }
                
                setDraft(parsed);
                
                // Also sync questions state
                if (parsed.draftContent.questions.length > 0) {
                    // Transform draft questions to Question interface
                    const loadedQuestions = parsed.draftContent.questions.map((q: ParsedDraftQuestion) => {
                        // Find options for this question
                        const questionOptions = parsed.draftContent.options
                            .filter((opt: ParsedDraftOption) => opt.question_id === q.question_id)
                            .map((opt: ParsedDraftOption, idx: number) => ({
                                id: opt.optionId || `${q.question_id}-opt-${idx}`,
                                text: opt.option_text
                            }));
                        
                        return {
                            id: (q.question_id || 1).toString(),
                            text: q.question_text,
                            type: q.question_type as Question['type'],
                            mandatory: q.mandatory || false,
                            correctAnswers: q.correct_answers || "",
                            options: questionOptions,
                            mediaFiles: q.mediaFiles?.map((m) => ({
                                id: m.mediaId.toString(),
                                url: m.fileUrl,
                                type: m.fileType,
                                status: m.status
                            }))
                        };
                    });
                    setQuestions(loadedQuestions);
                }
            }
        } catch (error) {
            console.error('Error loading draft:', error);
            toast.error("Failed to load saved draft");
            
            // Try to recover by checking if there's a backup
            const backupDraft = localStorage.getItem(BACKUP_KEY);
            if (backupDraft) {
                try {
                    setDraft(JSON.parse(backupDraft));
                    toast.success("Recovered from backup draft");
                } catch {
                    // If backup also fails, just continue with new draft
                }
            }
        }
    }, []);

    // Authorization and conductor data loading
    useEffect(() => {
        const loadConductorInfo = async () => {
            if (!loading && isAuthenticated && user) {
                // Check if user has Conducting role
                if (!user.roles?.includes("Conducting")) {
                    toast.error("Access denied. Conducting role required.");
                    router.push("/role-selection");
                    return;
                }

                try {
                    // Get current conductor information
                    const response = await fetch(`http://localhost:5171/api/Conductor/current`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        credentials: 'include',
                    });

                    if (response.ok) {
                        const conductorData = await response.json();
                        setConductorInfo({ conductorId: conductorData.conductorId });
                        
                        // Update draft with correct conductor_id
                        setDraft(prevDraft => ({
                            ...prevDraft,
                            draftContent: {
                                ...prevDraft.draftContent,
                                basicInfo: {
                                    ...prevDraft.draftContent.basicInfo,
                                    conductor_id: conductorData.conductorId
                                }
                            }
                        }));
                    } else {
                        toast.error("Failed to load conductor information");
                        router.push("/role-selection");
                    }
                } catch (error) {
                    console.error("Error loading conductor info:", error);
                    toast.error("Failed to load conductor information");
                    router.push("/role-selection");
                }
            }
        };

        loadConductorInfo();
    }, [user, isAuthenticated, loading, router]);

    // Debug whenever draft state changes
    useEffect(() => {
        console.log('Draft state updated:', { 
            draftId: draft.draftId, 
            questionsCount: draft.draftContent.questions.length,
            hasTitle: !!draft.draftContent.basicInfo.title
        });
    }, [draft]);

    // Don't render if not authorized or still loading conductor info
    if (loading || !isAuthenticated || !user?.roles?.includes("Conducting") || !conductorInfo) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <p className="text-lg">Loading...</p>
                    {!loading && !isAuthenticated && (
                        <p className="text-sm text-gray-500 mt-2">Please log in to continue</p>
                    )}
                    {!loading && isAuthenticated && !user?.roles?.includes("Conducting") && (
                        <p className="text-sm text-red-500 mt-2">Conducting role required</p>
                    )}
                </div>
            </div>
        );
    }

    // Save to localStorage and trigger backend sync
    const saveDraft = (updatedDraft: SurveyDraft) => {
        try {
            // Save to localStorage
            saveToLocalStorage(updatedDraft);
            
            // Queue the draft for syncing - this will be debounced
            queueDraftForSync(updatedDraft);
        } catch (error) {
            console.error('Error in saveDraft:', error);
            toast.error("Failed to save draft");
        }
    };

    // Update draft content with throttling for rapid changes
    const updateDraft = (updates: Partial<SurveyDraft['draftContent']>, lastEditedQuestionId?: string) => {
        // Batch state updates using a function update to avoid stale state issues
        setDraft(prevDraft => {
            const updatedDraft = {
                ...prevDraft,
                draftContent: {
                    ...prevDraft.draftContent,
                    ...updates
                },
                lastEditedQuestion: lastEditedQuestionId || prevDraft.lastEditedQuestion,
                lastSaved: new Date().toISOString()
            };
            
            // Save to localStorage and trigger debounced backend sync in the next frame
            requestAnimationFrame(() => {
                saveDraft(updatedDraft);
            });
            
            return updatedDraft;
        });
    };

    // Handle media upload
    const handleMediaUpload = async (file: File, questionId: string) => {
        // Parse question ID to number
        const questionIdNum = parseInt(questionId);
        
        // Create a temporary ID for the media file
        const tempMediaId = Date.now().toString();
        
        // Update UI state first with uploading status
        setQuestions(
            questions.map((q) =>
                q.id === questionId
                    ? {
                          ...q,
                          mediaFiles: [
                              ...(q.mediaFiles || []),
                              {
                                  id: tempMediaId,
                                  url: URL.createObjectURL(file),
                                  type: file.type.startsWith('image/') ? 'IMAGE' : 'DOCUMENT',
                                  status: 'UPLOADING'
                              }
                          ]
                      }
                    : q
            )
        );
        
        // Create form data for upload
        const formData = new FormData();
        formData.append('file', file);
        if (draft.draftId) {
            formData.append('draftId', draft.draftId.toString());
        }

        try {
            // Update draft state with uploading status
            const updatedDraftQuestions = draft.draftContent.questions.map(q =>
                q.question_id === questionIdNum ? {
                    ...q,
                    mediaFiles: [
                        ...(q.mediaFiles || []),
                        { 
                            mediaId: parseInt(tempMediaId), 
                            fileUrl: URL.createObjectURL(file), 
                            fileType: file.type.startsWith('image/') ? 'IMAGE' : 'DOCUMENT',
                            status: 'UPLOADING' as const 
                        }
                    ]
                } : q
            );
            
            // Update draft with uploading status
            updateDraft({ questions: updatedDraftQuestions });
            
            // Send to server
            const response = await fetch(`${API_BASE_URL}/api/v1/media/upload`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            const { mediaId, fileUrl, fileType } = await response.json();
            
            // Update UI state with success
            setQuestions(
                questions.map((q) =>
                    q.id === questionId
                        ? {
                              ...q,
                              mediaFiles: (q.mediaFiles || []).map(m => 
                                  m.id === tempMediaId 
                                      ? { ...m, id: mediaId.toString(), url: fileUrl, type: fileType, status: 'READY' }
                                      : m
                              )
                          }
                        : q
                )
            );

            // Update draft state with success
            const finalUpdatedQuestions = draft.draftContent.questions.map(q =>
                q.question_id === questionIdNum ? {
                    ...q,
                    mediaFiles: (q.mediaFiles || []).map(m => 
                        m.mediaId === parseInt(tempMediaId)
                            ? { mediaId, fileUrl, fileType, status: 'READY' as const }
                            : m
                    )
                } : q
            );

            updateDraft({ questions: finalUpdatedQuestions }, questionId);
            toast.success('Media uploaded successfully');
        } catch (error) {
            console.error('Upload failed:', error);
            
            // Update UI state with error
            setQuestions(
                questions.map((q) =>
                    q.id === questionId
                        ? {
                              ...q,
                              mediaFiles: (q.mediaFiles || []).map(m => 
                                  m.id === tempMediaId 
                                      ? { ...m, status: 'ERROR' }
                                      : m
                              )
                          }
                        : q
                )
            );
            
            // Update draft state with error
            const errorUpdatedQuestions = draft.draftContent.questions.map(q =>
                q.question_id === questionIdNum ? {
                    ...q,
                    mediaFiles: (q.mediaFiles || []).map(m => 
                        m.mediaId === parseInt(tempMediaId)
                            ? { ...m, status: 'ERROR' as const }
                            : m
                    )
                } : q
            );
            
            updateDraft({ questions: errorUpdatedQuestions });
            toast.error('Failed to upload media');
        }
    };
    
    // Handle file input change
    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>, questionId: string) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleMediaUpload(files[0], questionId);
            // Reset the input
            e.target.value = '';
        }
    };
    
    // Remove media from question
    const removeMedia = (questionId: string, mediaId: string) => {
        // Update UI state
        setQuestions(
            questions.map((q) =>
                q.id === questionId
                    ? {
                          ...q,
                          mediaFiles: (q.mediaFiles || []).filter(m => m.id !== mediaId)
                      }
                    : q
            )
        );
        
        // Update draft state
        const updatedQuestions = draft.draftContent.questions.map(q =>
            q.question_id === parseInt(questionId) ? {
                ...q,
                mediaFiles: (q.mediaFiles || []).filter(m => m.mediaId.toString() !== mediaId)
            } : q
        );
        
        updateDraft({ questions: updatedQuestions });
    };

    // Publish survey
    const handlePublish = async () => {
        setIsSubmitting(true);
        try {
            console.log("Starting publish process. Current draft:", {
                draftId: draft.draftId,
                hasTitle: !!draft.draftContent.basicInfo.title,
                questionsCount: draft.draftContent.questions.length
            });
            
            // Double-check if draftId is available in localStorage even if not in state
            if (!draft.draftId) {
                console.log("No draft ID in current state, checking localStorage");
                try {
                    const savedDraft = localStorage.getItem(STORAGE_KEY);
                    if (savedDraft) {
                        const parsed = JSON.parse(savedDraft);
                        if (parsed.draftId) {
                            console.log("Found draftId in localStorage that's not in state:", parsed.draftId);
                            // Update the state with the draftId from localStorage
                            const draftId = parsed.draftId;
                            setDraft(prevDraft => ({
                                ...prevDraft,
                                draftId: draftId
                            }));
                            
                            // Now publish the saved draft
                            const publishUrl = `${API_BASE_URL}/api/SurveyProxy/drafts/${draftId}/publish`;
                            console.log(`Publishing draft to: ${publishUrl}`);
                            
                            const response = await fetch(publishUrl, {
                                method: 'POST',
                                headers: { 
                                    'Content-Type': 'application/json',
                                    'Accept': 'application/json'
                                },
                                credentials: 'include',
                                body: JSON.stringify({
                                    normalizeQuestionIds: true // Add flag to tell backend to normalize question IDs
                                })
                            });
                            
                            if (!response.ok) {
                                const errorText = await response.text();
                                console.error('Publishing error response:', errorText);
                                throw new Error(`Failed to publish survey: ${response.status} ${errorText}`);
                            }
                            
                            const result = await response.json();
                            console.log('Publish response:', result);
                            
                            // Check if surveyId is in the data object
                            const surveyId = result.data?.surveyId;
                            if (!surveyId) {
                                console.warn('No surveyId returned in publish response');
                            }
                            
                            localStorage.removeItem(STORAGE_KEY);
                            localStorage.removeItem(BACKUP_KEY);
                            toast.success("Survey published successfully!");
                            router.push('/surveys');
                            return;
                        }
                    }
                } catch (e) {
                    console.error("Error checking localStorage for draftId:", e);
                }
                
                // If we got here, we didn't find a draftId in localStorage
                toast.info("Saving draft before publishing...");
                
                // Check if we have a valid draft to save
                if (!draft.draftContent.basicInfo.title && draft.draftContent.questions.length === 0) {
                    toast.warning("Please add a title or questions before publishing");
                    setIsSubmitting(false);
                    return;
                }
                
                // Save the draft first
                const savedDraft = await syncWithBackend(draft);
                if (!savedDraft || !savedDraft.draftId) {
                    toast.error("Failed to save draft before publishing");
                    setIsSubmitting(false);
                    return;
                }
                
                // Update the draft state with the saved draft
                setDraft(savedDraft);
                toast.success("Draft saved successfully");
                console.log("Draft saved. New draftId:", savedDraft.draftId);
            } else {
                console.log("Using existing draftId:", draft.draftId);
            }

            // Ensure we have a valid draftId before proceeding
            if (!draft.draftId) {
                console.error("Still no draftId after save attempt");
                toast.error("Could not obtain a draft ID. Please try saving manually first.");
                setIsSubmitting(false);
                return;
            }

            // Now publish the saved draft
            const publishUrl = `${API_BASE_URL}/api/SurveyProxy/drafts/${draft.draftId}/publish`;
            console.log(`Publishing draft to: ${publishUrl}`);
            
            const response = await fetch(publishUrl, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    normalizeQuestionIds: true // Add flag to tell backend to normalize question IDs
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Publishing error response:', errorText);
                throw new Error(`Failed to publish survey: ${response.status} ${errorText}`);
            }

            const result = await response.json();
            console.log('Publish response:', result);
            
            // Check if surveyId is in the data object
            const surveyId = result.data?.surveyId;
            if (!surveyId) {
                console.warn('No surveyId returned in publish response');
            }
            
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(BACKUP_KEY);
            toast.success("Survey published successfully!");
            router.push('/surveys');
        } catch (error: unknown) {
            console.error('Publishing failed:', error);
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            toast.error(`Failed to publish survey: ${errorMessage}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const addQuestion = () => {
        // Get the next sequential question ID
        const nextQuestionId = draft.draftContent.questions.length > 0 
            ? Math.max(...draft.draftContent.questions.map(q => q.question_id).filter(id => id !== undefined)) + 1
            : 1;
        
        const optionId = `${nextQuestionId}-opt-0`;
        
        // Create question for UI state
        const newQuestion: Question = {
            id: nextQuestionId.toString(),
            text: "",
            type: "multiple-choice",
            options: [{ id: optionId, text: "" }],
            mediaFiles: [],
            mandatory: false,
            correctAnswers: ""
        };
        
        // Update UI state
        setQuestions([...questions, newQuestion]);
        
        // Also update draft state for localStorage
        const newDraftQuestion = {
            question_id: nextQuestionId,
            question_text: "",
            question_type: "multiple-choice",
            mandatory: false,
            branching_logic: "",
            correct_answers: "",
            mediaFiles: []
        };
        
        // Add a default option to the options array
        const newOption = {
            optionId: optionId,
            question_id: nextQuestionId,
            option_text: ""
        };
        
        // Update draft content
        updateDraft({
            questions: [...draft.draftContent.questions, newDraftQuestion],
            options: [...draft.draftContent.options, newOption]
        });
    };

    const deleteQuestion = (questionId: string) => {
        // Parse question ID to number
        const questionIdNum = parseInt(questionId);
        
        // Update UI state
        setQuestions(questions.filter((q) => q.id !== questionId));
        
        // Also update draft state for localStorage
        updateDraft({
            questions: draft.draftContent.questions.filter(q => q.question_id !== questionIdNum),
            options: draft.draftContent.options.filter(opt => opt.question_id !== questionIdNum)
        });
    };

    const addOption = (questionId: string) => {
        // Parse question ID to number
        const questionIdNum = parseInt(questionId);
        
        // Count existing options for this question to generate a unique option ID
        const optionCount = draft.draftContent.options.filter(
            opt => opt.question_id === questionIdNum
        ).length;
        
        const optionId = `${questionIdNum}-opt-${optionCount}`;
        
        // Update UI state
        setQuestions(
            questions.map((q) =>
                q.id === questionId
                    ? {
                          ...q,
                          options: [...q.options, { id: optionId, text: "" }],
                      }
                    : q,
            ),
        );
        
        // Also update draft state for localStorage
        const newOption = {
            optionId: optionId,
            question_id: questionIdNum,
            option_text: ""
        };
        
        updateDraft({
            options: [...draft.draftContent.options, newOption]
        });
    };

    const deleteOption = (questionId: string, optionId: string) => {
        // Parse question ID to number
        const questionIdNum = parseInt(questionId);
        
        // Update UI state
        setQuestions(
            questions.map((q) =>
                q.id === questionId
                    ? {
                          ...q,
                          options: q.options.filter((opt) => opt.id !== optionId),
                      }
                    : q,
            ),
        );
        
        // Also update draft state for localStorage
        updateDraft({
            options: draft.draftContent.options.filter(opt => 
                !(opt.question_id === questionIdNum && opt.optionId === optionId)
            )
        });
    };

    // Manual save handler (skips debounce)
    const handleManualSave = async () => {
        try {
            // Cancel any pending debounced saves
            const debouncedFn = queueDraftForSync as { cancel?: () => void };
            if (debouncedFn && typeof debouncedFn.cancel === 'function') {
                debouncedFn.cancel();
            }
            
            // Clear any pending draft
            pendingDraftRef.current = null;
            
            // Wait for any in-progress sync to complete
            if (isSyncingRef.current) {
                toast.info("Waiting for in-progress sync to complete...");
                // Use a more efficient waiting approach
                await new Promise<void>((resolve) => {
                    // Check sync status every 100ms instead of blocking for long periods
                    const checkSync = () => {
                        if (!isSyncingRef.current) {
                            resolve();
                        } else {
                            setTimeout(checkSync, 100);
                        }
                    };
                    
                    // First check after 500ms
                    setTimeout(checkSync, 500);
                });
            }
            
            setIsLoading(true);
            
            // Check if we have a valid draft to save
            if (!draft.draftContent.basicInfo.title && draft.draftContent.questions.length === 0) {
                toast.warning("Please add a title or questions before saving");
                setIsLoading(false);
                return;
            }
            
            console.log("Manual save - draft before sync:", {
                draftId: draft.draftId,
                title: draft.draftContent.basicInfo.title,
                questionsCount: draft.draftContent.questions.length
            });
            
            try {
                const savedDraft = await syncWithBackend(draft);
                console.log("Manual save - draft after sync:", {
                    draftId: savedDraft?.draftId,
                    wasSuccessful: !!savedDraft
                });
                
                if (savedDraft) {
                    // Explicitly update the state with the saved draft
                    setDraft(savedDraft);
                    
                    // Also save directly to localStorage for redundancy
                    console.log("Saving draft to localStorage with ID:", savedDraft.draftId);
                    saveToLocalStorage(savedDraft);
                    
                    console.log("Draft state explicitly updated with ID:", savedDraft.draftId);
                    toast.success("Draft saved successfully");
                    
                    // Verify the state update
                    setTimeout(() => {
                        console.log("Verifying draft state after update, current draftId:", draft.draftId);
                    }, 100);
                }
            } catch (error) {
                console.error("Inner manual save error:", error);
                throw error;
            } finally {
                setIsLoading(false);
            }
        } catch (error) {
            console.error("Manual save failed:", error);
            toast.error("Failed to save draft");
            setIsLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-4 space-y-4">
            {/* Survey Type Selector only visible in basic info section */}
            {currentSection === 'basic' && (
                <div className="mb-4 p-4 border rounded bg-gray-50">
                    <div className="font-semibold mb-2">Select Survey Type</div>
                    <Select
                        value={selectedType}
                        onValueChange={(value) => {
                            setSelectedType(value);
                            // Reset draft type and questions
                            updateDraft({
                                basicInfo: {
                                    ...draft.draftContent.basicInfo,
                                    status: value === "quiz" ? "QUIZ" : "DRAFT"
                                },
                                questions: [],
                                options: []
                            });
                            setQuestions([]);
                        }}
                    >
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Choose type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="survey">Survey</SelectItem>
                            <SelectItem value="quiz">Quiz</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            )}
            {/* CSV Upload */}
            
                {currentSection === 'basic' && (
                  <>
                  {/* Template Selector and CSV Upload only visible in basic info section */}
                  <div className="mb-4 p-4 border rounded bg-gray-50">
                      <div className="font-semibold mb-2">Select a {selectedType === "quiz" ? "Quiz" : "Survey"} Template or Import CSV</div>
                      <div className="flex gap-4 items-center">
                          <Select
                              defaultValue={""}
                              onValueChange={(templateKey) => {
                                  // Top-level templates object for SmartSurvey-style templates
                                  // Filter templates by type
                                  const filtered = Object.entries(templates).filter(([key, tpl]) =>
                                      selectedType === "quiz" ? tpl.type === "quiz" : tpl.type === "survey"
                                  );
                                  const selected = filtered.find(([key]) => key === templateKey)?.[1];
                                  if (selected) {
                                      updateDraft({
                                          basicInfo: {
                                              ...draft.draftContent.basicInfo,
                                              title: selected.title,
                                              description: selected.description,
                                              status: selectedType === "quiz" ? "QUIZ" : "DRAFT"
                                          },
                                          questions: selected.questions.map((q: any, idx: number) => ({
                                              question_id: idx + 1,
                                              question_text: q.text,
                                              question_type: q.type,
                                              mandatory: q.mandatory,
                                              correct_answers: q.correctAnswers || "",
                                              branching_logic: "",
                                              tempId: q.id,
                                              mediaFiles: [],
                                          })),
                                          options: selected.questions.flatMap((q: any, idx: number) =>
                                              (q.options || []).map((opt: any) => ({
                                                  optionId: opt.id,
                                                  question_id: idx + 1,
                                                  option_text: opt.text
                                              }))
                                          )
                                      });
                                      setQuestions(selected.questions.map((q: any, idx: number) => ({
                                          id: (idx + 1).toString(),
                                          text: q.text,
                                          type: q.type,
                                          options: q.options || [],
                                          mandatory: q.mandatory,
                                          correctAnswers: q.correctAnswers || "",
                                          mediaFiles: [],
                                      })));
                                  }
                              }}
                          >
                              <SelectTrigger className="w-[180px]">
                                  <SelectValue placeholder="Choose a template" />
                              </SelectTrigger>
                              <SelectContent>
                                  {Object.entries(templates)
                                      .filter(([key, tpl]) => selectedType === (tpl as any).type)
                                      .map(([key, tpl]) => {
                                          const t = tpl as any;
                                          return (
                                              <SelectItem key={key} value={key}>
                                                  <div>
                                                      <div className="font-semibold">{t.title}</div>
                                                      <div className="text-xs text-muted-foreground">{t.description}</div>
                                                  </div>
                                              </SelectItem>
                                          );
                                      })}
                              </SelectContent>
                          </Select>
                          {/* CSV Upload */}
                          <div className="flex flex-col gap-1">
                              <label htmlFor="csv-upload" className="text-sm font-medium">CSV Upload</label>
                              <input
                                  id="csv-upload"
                                  type="file"
                                  accept=".csv"
                                  onChange={e => {
                                      setCsvError("");
                                      setCsvPreview([]);
                                      const file = e.target.files?.[0];
                                      if (!file) return;
                                      Papa.parse(file, {
                                          header: true,
                                          skipEmptyLines: true,
                                          complete: (results: Papa.ParseResult<any>) => {
                                              if (results.errors && results.errors.length) {
                                                  setCsvError("CSV parsing error: " + results.errors[0].message);
                                              } else {
                                                  setCsvPreview(results.data as any[]);
                                              }
                                          }
                                      });
                                  }}
                              />
                              {csvError && <div className="text-red-500 text-xs">{csvError}</div>}
                              {csvPreview.length > 0 && (
                                  <div className="border rounded p-2 mt-2 bg-gray-50">
                                      <div className="font-semibold mb-1">CSV Preview</div>
                                      <table className="text-xs w-full">
                                          <thead>
                                              <tr>
                                                  {Object.keys(csvPreview[0] as Record<string, any>).map((col) => (
                                                      <th key={col} className="px-2 py-1 border-b">{col}</th>
                                                  ))}
                                              </tr>
                                          </thead>
                                          <tbody>
                                              {csvPreview.map((row, idx) => (
                                                  <tr key={idx}>
                                                      {Object.values(row as Record<string, any>).map((val, i) => (
                                                          <td key={i} className="px-2 py-1 border-b">{String(val)}</td>
                                                      ))}
                                                  </tr>
                                              ))}
                                          </tbody>
                                      </table>
                                      <button
                                          className="mt-2 px-3 py-1 bg-blue-600 text-white rounded"
                                          onClick={() => {
                                              // Enhanced CSV import: handle all question types and map options per question
                                              let newQuestions: any[] = [];
                                              let newOptions: any[] = [];
                                              csvPreview.forEach((row, idx) => {
                                                  if (row.questions) {
                                                      const questionsArr = row.questions.split(";").map((q: string) => q.trim()).filter(Boolean);
                                                      // Split options by semicolon to get groups per question
                                                      const optionsGroups = row.options ? row.options.split(";").map((g: string) => g.trim()) : [];
                                                      // Split types by semicolon if provided, else fallback to row.question_type
                                                      const typesArr = row.question_type ? row.question_type.split(";").map((t: string) => t.trim()) : [];
                                                      // Split mandatory by semicolon if provided
                                                      const mandatoryArr = row.mandatory ? row.mandatory.split(";").map((m: string) => m.trim()) : [];
                                                      // Split correct answers by semicolon if provided
                                                      const correctArr = row.correctAnswers ? row.correctAnswers.split(";").map((c: string) => c.trim()) : [];
                                                      questionsArr.forEach((qText: string, qIdx: number) => {
                                                          // Determine type for this question
                                                          let qType = typesArr[qIdx] || row.type || row.question_type || "single-choice";
                                                          // Normalize type
                                                          if (["single", "single-choice", "radio"].includes(qType.toLowerCase())) qType = "single-choice";
                                                          else if (["multiple", "multiple-choice", "checkbox"].includes(qType.toLowerCase())) qType = "multiple-choice";
                                                          else if (["text", "input", "open-ended"].includes(qType.toLowerCase())) qType = "text";
                                                          else if (["rating", "scale"].includes(qType.toLowerCase())) qType = "rating";
                                                          // Determine mandatory
                                                          let mandatory = mandatoryArr[qIdx] ? ["true", "yes", "1"].includes(mandatoryArr[qIdx].toLowerCase()) : (row.mandatory === "true" || row.mandatory === true);
                                                          // Determine correct answer
                                                          let correct = correctArr[qIdx] || "";
                                                          const nextQuestionId = newQuestions.length + 1;
                                                          newQuestions.push({
                                                              question_id: nextQuestionId,
                                                              question_text: qText,
                                                              question_type: qType,
                                                              mandatory,
                                                              correct_answers: correct,
                                                              branching_logic: "",
                                                              tempId: String(nextQuestionId),
                                                              mediaFiles: [],
                                                          });
                                                          // For each question, get its options group and split by comma
                                                          if (optionsGroups[qIdx]) {
                                                              const opts = optionsGroups[qIdx].split(",").map((opt: string) => opt.trim()).filter(Boolean);
                                                              opts.forEach((opt: string, i: number) => {
                                                                  newOptions.push({
                                                                      optionId: String.fromCharCode(97 + i),
                                                                      question_id: nextQuestionId,
                                                                      option_text: opt
                                                                  });
                                                              });
                                                          }
                                                      });
                                                  }
                                              });
                                              updateDraft({
                                                  ...draft.draftContent,
                                                  questions: newQuestions,
                                                  options: newOptions
                                              });
                                              setQuestions(newQuestions.map((q) => ({
                                                  id: q.question_id.toString(),
                                                  text: q.question_text,
                                                  type: q.question_type,
                                                  options: newOptions.filter(opt => opt.question_id === q.question_id).map(opt => ({ id: opt.optionId, text: opt.option_text })),
                                                  mandatory: q.mandatory,
                                                  correctAnswers: q.correct_answers || "",
                                                  mediaFiles: [],
                                              })));
                                              setCsvPreview([]);
                                              toast.success(`Imported CSV. Click Next to view questions.`);
                                          }}
                                      >Import to Survey</button>
                                  </div>
                              )}
                          </div>
                      </div>
                  </div>
                  </>
                )}
            
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Create Survey</h1>
            </div>

            <Progress
                value={
                    currentSection === 'basic' ? 33 :
                    currentSection === 'questions' ? 66 : 100
                }
                className="w-full"
            />

            <Card className="w-full">
                {currentSection === 'basic' && (
                    <>
                        <CardHeader>
                            <CardTitle>Basic Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Input
                                placeholder="Survey Title"
                                value={draft.draftContent.basicInfo.title}
                                onChange={(e) => updateDraft({
                                    basicInfo: { ...draft.draftContent.basicInfo, title: e.target.value }
                                })}
                            />
                            <Textarea
                                placeholder="Survey Description"
                                value={draft.draftContent.basicInfo.description}
                                onChange={(e) => updateDraft({
                                    basicInfo: { ...draft.draftContent.basicInfo, description: e.target.value }
                                })}
                            />
                        </CardContent>
                    </>
                )}

                {currentSection === 'questions' && (
                    <>
                        <CardHeader>
                            <CardTitle>Questions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {questions.map((question) => (
                                <div
                                    key={question.id}
                                    className="border rounded-lg p-4 space-y-4"
                                >
                                    <div className="flex justify-between items-center">
                                        <Select 
                                            defaultValue={question.type}
                                            onValueChange={(value: Question['type']) => {
                                                setQuestions(
                                                    questions.map((q) =>
                                                        q.id === question.id
                                                            ? { ...q, type: value }
                                                            : q,
                                                    )
                                                );
                                                updateDraft({
                                                    questions: draft.draftContent.questions.map(q => 
                                                        q.question_id === parseInt(question.id)
                                                            ? { ...q, question_type: value }
                                                            : q
                                                    )
                                                });
                                            }}
                                        >
                                            <SelectTrigger className="w-[180px]">
                                                <SelectValue placeholder="Question type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="multiple-choice">
                                                    Multiple Choice
                                                </SelectItem>
                                                <SelectItem value="single-choice">
                                                    Single Choice
                                                </SelectItem>
                                                <SelectItem value="text">Text Input</SelectItem>
                                                <SelectItem value="rating">Rating Scale</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2">
                                                <Checkbox
                                                    id={`mandatory-${question.id}`}
                                                    checked={question.mandatory}
                                                    onCheckedChange={(checked: CheckedState) => {
                                                        const isChecked = checked === true;
                                                        setQuestions(
                                                            questions.map((q) =>
                                                                q.id === question.id
                                                                    ? { ...q, mandatory: isChecked }
                                                                    : q,
                                                            ),
                                                        );
                                                        updateDraft({
                                                            questions: draft.draftContent.questions.map(q => 
                                                                q.question_id === parseInt(question.id)
                                                                    ? { ...q, mandatory: isChecked }
                                                                    : q
                                                            )
                                                        });
                                                    }}
                                                />
                                                <label htmlFor={`mandatory-${question.id}`} className="text-sm font-medium">
                                                    Required
                                                </label>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => deleteQuestion(question.id)}
                                                className="text-destructive"
                                            >
                                                Delete
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="relative">
                                        <Input
                                            value={question.text}
                                            placeholder="Enter question text"
                                            className={question.mandatory ? "pr-8" : ""}
                                            onChange={(e) => {
                                                setQuestions(
                                                    questions.map((q) =>
                                                        q.id === question.id
                                                            ? { ...q, text: e.target.value }
                                                            : q,
                                                    ),
                                                );
                                                updateDraft({
                                                    questions: draft.draftContent.questions.map(q => 
                                                        q.question_id === parseInt(question.id)
                                                            ? { ...q, question_text: e.target.value }
                                                            : q
                                                    )
                                                });
                                            }}
                                        />
                                        {question.mandatory && (
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500 text-lg">*</span>
                                        )}
                                    </div>

                                    {/* Only show correct answers for quiz type */}
                                    {draft.draftContent.basicInfo.status === "QUIZ" && (
                                        <div className="space-y-2 mt-4">
                                            <label htmlFor={`correct-answers-${question.id}`} className="text-sm font-medium flex items-center gap-2">
                                                Correct Answer(s)
                                                <span className="text-xs text-muted-foreground">
                                                    {question.type === "multiple-choice" 
                                                        ? "(Comma-separated option numbers, e.g. 1,3,4)" 
                                                        : question.type === "single-choice" 
                                                        ? "(Enter the correct option number, e.g. 2)" 
                                                        : "(Enter the correct answer text)"}
                                                </span>
                                            </label>
                                            <Input
                                                id={`correct-answers-${question.id}`}
                                                value={question.correctAnswers || ""}
                                                placeholder="Enter correct answer(s)"
                                                onChange={(e) => {
                                                    setQuestions(
                                                        questions.map((q) =>
                                                            q.id === question.id
                                                                ? { ...q, correctAnswers: e.target.value }
                                                                : q
                                                        )
                                                    );
                                                    updateDraft({
                                                        questions: draft.draftContent.questions.map(q => 
                                                            q.question_id === parseInt(question.id)
                                                                ? { ...q, correct_answers: e.target.value }
                                                                : q
                                                        )
                                                    });
                                                }}
                                            />
                                        </div>
                                    )}

                                    {/* Media upload and display section */}
                                    <div className="mt-4 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="text-sm font-medium">Media Attachments</div>
                                            <label 
                                                htmlFor={`media-upload-${question.id}`}
                                                className="flex items-center gap-1 text-sm cursor-pointer text-primary hover:underline"
                                            >
                                                <Upload className="h-4 w-4" />
                                                Add Media
                                            </label>
                                            <input
                                                id={`media-upload-${question.id}`}
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => handleFileInputChange(e, question.id)}
                                            />
                                        </div>
                                        
                                        {/* Display uploaded media */}
                                        {question.mediaFiles && question.mediaFiles.length > 0 && (
                                            <div className="grid grid-cols-2 gap-2 mt-2">
                                                {question.mediaFiles.map((media) => (
                                                    <div 
                                                        key={media.id} 
                                                        className="relative border rounded-md overflow-hidden group"
                                                    >
                                                        {media.status === 'UPLOADING' && (
                                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                                <Loader2 className="h-6 w-6 animate-spin text-white" />
                                                            </div>
                                                        )}
                                                        
                                                        {media.status === 'ERROR' && (
                                                            <div className="absolute inset-0 bg-red-500/50 flex items-center justify-center">
                                                                <div className="text-white text-sm">Upload Failed</div>
                                                            </div>
                                                        )}
                                                        
                                                        {media.type === 'IMAGE' ? (
                                                            <img 
                                                                src={media.url} 
                                                                alt="Question media" 
                                                                className="w-full h-32 object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-32 bg-gray-100 flex items-center justify-center">
                                                                <FileImage className="h-10 w-10 text-gray-400" />
                                                            </div>
                                                        )}
                                                        
                                                        <button
                                                            onClick={() => removeMedia(question.id, media.id)}
                                                            className="absolute top-1 right-1 bg-white/80 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                            aria-label="Remove media"
                                                        >
                                                            <X className="h-4 w-4 text-red-500" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {question.type !== "text" && (
                                        <div className="space-y-2 ml-4">
                                            {question.options.map((option) => (
                                                <div key={option.id} className="flex gap-2 items-center">
                                                    <Input
                                                        value={option.text}
                                                        placeholder="Option text"
                                                        className="flex-1"
                                                        onChange={(e) => {
                                                            // Update UI state
                                                            setQuestions(
                                                                questions.map((q) =>
                                                                    q.id === question.id
                                                                        ? {
                                                                                ...q,
                                                                                options: q.options.map((opt) =>
                                                                                    opt.id === option.id
                                                                                        ? { ...opt, text: e.target.value }
                                                                                        : opt,
                                                                                ),
                                                                            }
                                                                        : q,
                                                                ),
                                                            );
                                                            
                                                            // Also update draft state for localStorage
                                                            updateDraft({
                                                                options: draft.draftContent.options.map(opt => 
                                                                    (opt.question_id === parseInt(question.id) && opt.optionId === option.id)
                                                                        ? { ...opt, option_text: e.target.value }
                                                                        : opt
                                                                )
                                                            });
                                                        }}
                                                    />
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => deleteOption(question.id, option.id)}
                                                        className="text-destructive"
                                                    >
                                                        ×
                                                    </Button>
                                                </div>
                                            ))}
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => addOption(question.id)}
                                                className="mt-2"
                                            >
                                                + Add Option
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            ))}

                            <Button variant="outline" onClick={addQuestion} className="w-full">
                                + Add Question
                            </Button>
                        </CardContent>
                    </>
                )}

                {currentSection === 'branching' && (
                    <>
                        <CardHeader>
                            <CardTitle>Branching Logic</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Add branching logic section content here */}
                        </CardContent>
                    </>
                )}

                <CardFooter className="flex justify-between">
                    <Button
                        variant="outline"
                        onClick={() => setCurrentSection(prev => 
                            prev === 'branching' ? 'questions' :
                            prev === 'questions' ? 'basic' : 'basic'
                        )}
                        disabled={currentSection === 'basic'}
                    >
                        Previous
                    </Button>
                    <Button
                        onClick={async () => {
                            if (currentSection === 'basic') {
                                setCurrentSection('questions');
                            } else if (currentSection === 'questions') {
                                setCurrentSection('branching');
                                
                                // Auto-save when reaching the branching (publish) section
                                if (!draft.draftId) {
                                    console.log("Auto-saving when reaching publish section");
                                    await handleManualSave();
                                    // Force reload the draft ID from localStorage as a fallback
                                    try {
                                        const savedDraft = localStorage.getItem(STORAGE_KEY);
                                        if (savedDraft) {
                                            const parsed = JSON.parse(savedDraft);
                                            if (parsed.draftId) {
                                                console.log("Forced loading of draft ID from localStorage:", parsed.draftId);
                                                setDraft(prevDraft => ({
                                                    ...prevDraft,
                                                    draftId: parsed.draftId
                                                }));
                                            }
                                        }
                                    } catch (e) {
                                        console.error("Error loading draft ID from localStorage", e);
                                    }
                                }
                            } else if (currentSection === 'branching') {
                                console.log('Publish button clicked! Current draft state:', { 
                                    draftId: draft.draftId, 
                                    hasTitle: !!draft.draftContent.basicInfo.title,
                                    questionsCount: draft.draftContent.questions.length
                                });
                                
                                // Double check draft ID exists before publishing
                                if (!draft.draftId) {
                                    console.log("No draft ID found, attempting emergency save");
                                    await handleManualSave();
                                }
                                
                                handlePublish();
                            }
                        }}
                        disabled={isSubmitting}
                    >
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {currentSection === 'branching' ? 'Publish' : 'Next'}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}

