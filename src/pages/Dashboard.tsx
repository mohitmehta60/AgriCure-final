import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardHeader from "@/components/DashboardHeader";
import EnhancedFarmOverview from "@/components/EnhancedFarmOverview";
import RealTimeSoilAnalysis from "@/components/RealTimeSoilAnalysis";
import EnhancedFertilizerForm from "@/components/EnhancedFertilizerForm";
import EnhancedFertilizerRecommendations from "@/components/EnhancedFertilizerRecommendations";
import { predictFertilizer, FERTILIZER_INFO, CROP_TYPES, SOIL_TYPES } from "@/services/fertilizerMLService";
import { authService } from "@/services/authService";
import { recommendationService } from "@/services/recommendationService";
import { UserProfile } from "@/services/supabaseClient";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface FormData {
  fieldName: string;
  fieldSize: string;
  sizeUnit: string;
  cropType: string;
  soilPH: string;
  nitrogen: string;
  phosphorus: string;
  potassium: string;
  soilType: string;
  temperature: string;
  humidity: string;
  soilMoisture: string;
}

interface EnhancedRecommendation {
  primaryFertilizer: {
    name: string;
    amount: string;
    reason: string;
    applicationMethod: string;
  };
  secondaryFertilizer: {
    name: string;
    amount: string;
    reason: string;
    applicationMethod: string;
  };
  organicOptions: Array<{
    name: string;
    amount: string;
    benefits: string;
    applicationTiming: string;
  }>;
  applicationTiming: {
    primary: string;
    secondary: string;
    organic: string;
  };
  costEstimate: {
    primary: string;
    secondary: string;
    organic: string;
    total: string;
  };
  soilConditionAnalysis: {
    phStatus: string;
    nutrientDeficiency: string[];
    moistureStatus: string;
    recommendations: string[];
  };
  mlPrediction: {
    fertilizer: string;
    confidence: number;
  };
}

const Dashboard = () => {
  const [formData, setFormData] = useState<FormData | null>(null);
  const [recommendations, setRecommendations] = useState<EnhancedRecommendation | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { user: currentUser, error } = await authService.getCurrentUser();
      
      if (error || !currentUser) {
        navigate('/login');
        return;
      }

      setUser(currentUser);
      
      // Load user profile
      const { data: profile, error: profileError } = await authService.getUserProfile(currentUser.id);
      if (!profileError && profile) {
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      navigate('/login');
    } finally {
      setIsLoading(false);
    }
  };

  const generateEnhancedRecommendations = async (data: FormData): Promise<EnhancedRecommendation> => {
    const pH = parseFloat(data.soilPH);
    const nitrogen = parseFloat(data.nitrogen);
    const phosphorus = parseFloat(data.phosphorus);
    const potassium = parseFloat(data.potassium);
    const moisture = parseFloat(data.soilMoisture);
    const fieldSize = parseFloat(data.fieldSize);

    // Convert to hectares for calculations
    const convertToHectares = (size: number, unit: string): number => {
      switch (unit) {
        case 'acres': return size * 0.404686;
        case 'bigha': return size * 0.1338;
        case 'hectares':
        default: return size;
      }
    };

    const hectares = convertToHectares(fieldSize, data.sizeUnit);

    // Get ML prediction
    const mlInput = {
      temperature: parseFloat(data.temperature),
      humidity: parseFloat(data.humidity),
      moisture: parseFloat(data.soilMoisture),
      soilType: parseInt(data.soilType),
      cropType: parseInt(data.cropType),
      nitrogen: nitrogen,
      potassium: potassium,
      phosphorus: phosphorus
    };

    const mlPrediction = await predictFertilizer(mlInput);

    // Analyze soil conditions
    const phStatus = pH < 6.0 ? 'Acidic' : pH > 7.5 ? 'Alkaline' : 'Optimal';
    const moistureStatus = moisture < 40 ? 'Low' : moisture > 80 ? 'High' : 'Optimal';
    
    const nutrientDeficiency = [];
    if (nitrogen < 30) nutrientDeficiency.push('Nitrogen');
    if (phosphorus < 15) nutrientDeficiency.push('Phosphorus');
    if (potassium < 120) nutrientDeficiency.push('Potassium');

    // Get crop and soil names
    const cropName = Object.keys(CROP_TYPES).find(key => CROP_TYPES[key as keyof typeof CROP_TYPES] === parseInt(data.cropType)) || 'Unknown';
    const soilName = Object.keys(SOIL_TYPES).find(key => SOIL_TYPES[key as keyof typeof SOIL_TYPES] === parseInt(data.soilType)) || 'Unknown';

    // Use ML prediction as primary fertilizer
    const primaryFertilizerInfo = FERTILIZER_INFO[mlPrediction.fertilizer as keyof typeof FERTILIZER_INFO];
    
    const primaryFertilizer = {
      name: mlPrediction.fertilizer,
      amount: `${Math.round(100 * hectares)} kg`,
      reason: primaryFertilizerInfo ? primaryFertilizerInfo.description : `ML model recommends this fertilizer for ${cropName} in ${soilName} soil`,
      applicationMethod: primaryFertilizerInfo ? primaryFertilizerInfo.application : 'Apply as per standard agricultural practices'
    };

    // Generate secondary fertilizer based on deficiencies
    let secondaryFertilizer;
    if (nutrientDeficiency.includes('Phosphorus')) {
      secondaryFertilizer = {
        name: 'DAP',
        amount: `${Math.round(50 * hectares)} kg`,
        reason: 'Addresses phosphorus deficiency identified in soil analysis',
        applicationMethod: 'Apply as basal dose during soil preparation'
      };
    } else if (nutrientDeficiency.includes('Potassium')) {
      secondaryFertilizer = {
        name: 'Potassium sulfate',
        amount: `${Math.round(40 * hectares)} kg`,
        reason: 'Addresses potassium deficiency for better fruit quality',
        applicationMethod: 'Apply during fruit development stage'
      };
    } else {
      secondaryFertilizer = {
        name: 'Organic Compost',
        amount: `${Math.round(1000 * hectares)} kg`,
        reason: 'Improves soil structure and provides slow-release nutrients',
        applicationMethod: 'Apply 2-3 weeks before planting and incorporate into soil'
      };
    }

    // Calculate costs in INR (Indian Rupees)
    const primaryCost = Math.round(hectares * 4000); // ₹4,000 per hectare
    const secondaryCost = Math.round(hectares * 2500); // ₹2,500 per hectare
    const organicCost = Math.round(hectares * 2000); // ₹2,000 per hectare
    const totalCost = primaryCost + secondaryCost + organicCost;

    return {
      primaryFertilizer,
      secondaryFertilizer,
      organicOptions: [
        {
          name: 'Vermicompost',
          amount: `${Math.round(1000 * hectares)} kg`,
          benefits: 'Rich in nutrients, improves soil structure and water retention',
          applicationTiming: 'Apply 3-4 weeks before planting'
        },
        {
          name: 'Neem Cake',
          amount: `${Math.round(200 * hectares)} kg`,
          benefits: 'Natural pest deterrent and slow-release nitrogen source',
          applicationTiming: 'Apply at the time of land preparation'
        },
        {
          name: 'Bone Meal',
          amount: `${Math.round(150 * hectares)} kg`,
          benefits: 'Excellent source of phosphorus and calcium',
          applicationTiming: 'Apply as basal dose before sowing'
        }
      ],
      applicationTiming: {
        primary: 'Apply 1-2 weeks before planting for optimal nutrient availability',
        secondary: 'Apply during active growth phase or as recommended for specific fertilizer',
        organic: 'Apply 3-4 weeks before planting to allow decomposition'
      },
      costEstimate: {
        primary: `₹${primaryCost.toLocaleString('en-IN')}`,
        secondary: `₹${secondaryCost.toLocaleString('en-IN')}`,
        organic: `₹${organicCost.toLocaleString('en-IN')}`,
        total: `₹${totalCost.toLocaleString('en-IN')}`
      },
      soilConditionAnalysis: {
        phStatus,
        nutrientDeficiency,
        moistureStatus,
        recommendations: [
          phStatus !== 'Optimal' ? `Adjust soil pH using ${pH < 6.0 ? 'lime' : 'sulfur'}` : 'Maintain current pH levels',
          moistureStatus === 'Low' ? 'Increase irrigation frequency' : moistureStatus === 'High' ? 'Improve drainage' : 'Maintain current moisture levels',
          nutrientDeficiency.length > 0 ? `Address ${nutrientDeficiency.join(', ')} deficiency` : 'Nutrient levels are adequate',
          'Regular soil testing every 6 months is recommended',
          'Consider crop rotation to maintain soil health'
        ].filter(Boolean)
      },
      mlPrediction
    };
  };

  const handleFormSubmit = async (data: FormData) => {
    setIsGenerating(true);
    setFormData(data);
    
    try {
      const enhancedRecommendations = await generateEnhancedRecommendations(data);
      setRecommendations(enhancedRecommendations);
      
      // Save recommendation to database
      if (user) {
        const recommendationData = {
          user_id: user.id,
          field_name: data.fieldName,
          field_size: parseFloat(data.fieldSize),
          field_size_unit: data.sizeUnit,
          crop_type: data.cropType,
          soil_type: data.soilType,
          soil_ph: parseFloat(data.soilPH),
          nitrogen: parseFloat(data.nitrogen),
          phosphorus: parseFloat(data.phosphorus),
          potassium: parseFloat(data.potassium),
          temperature: parseFloat(data.temperature),
          humidity: parseFloat(data.humidity),
          soil_moisture: parseFloat(data.soilMoisture),
          primary_fertilizer: enhancedRecommendations.primaryFertilizer.name,
          secondary_fertilizer: enhancedRecommendations.secondaryFertilizer.name,
          ml_prediction: enhancedRecommendations.mlPrediction.fertilizer,
          confidence_score: enhancedRecommendations.mlPrediction.confidence,
          cost_estimate: enhancedRecommendations.costEstimate.total,
          status: 'pending' as const
        };

        const { error: saveError } = await recommendationService.createRecommendation(recommendationData);
        if (saveError) {
          console.error('Error saving recommendation:', saveError);
          toast({
            title: "Warning",
            description: "Recommendation generated but not saved to history",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      console.error('Error generating recommendations:', error);
      toast({
        title: "Error",
        description: "Failed to generate recommendations",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleProfileUpdate = (profile: UserProfile) => {
    setUserProfile(profile);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-grass-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader 
        user={user} 
        userProfile={userProfile} 
        onProfileUpdate={handleProfileUpdate}
      />
      
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div className="mb-4 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Farm Dashboard</h1>
          <p className="text-sm sm:text-base text-gray-600">
            Comprehensive soil analysis and fertilizer recommendations powered by real-time data and ML
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-3 h-auto">
            <TabsTrigger value="overview" className="text-xs sm:text-sm px-2 sm:px-4 py-2">
              Overview
            </TabsTrigger>
            <TabsTrigger value="soil-analysis" className="text-xs sm:text-sm px-2 sm:px-4 py-2">
              Soil Analysis
            </TabsTrigger>
            <TabsTrigger value="recommendations" className="text-xs sm:text-sm px-2 sm:px-4 py-2">
              ML Recommendations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 sm:space-y-6">
            <EnhancedFarmOverview user={user} />
          </TabsContent>

          <TabsContent value="soil-analysis" className="space-y-4 sm:space-y-6">
            <RealTimeSoilAnalysis />
          </TabsContent>

          <TabsContent value="recommendations" className="space-y-4 sm:space-y-6">
            <EnhancedFertilizerForm onSubmit={handleFormSubmit} />
            {isGenerating && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-grass-600"></div>
                <span className="ml-2 text-sm sm:text-base">Generating ML-based recommendations...</span>
              </div>
            )}
            {recommendations && formData && !isGenerating && (
              <EnhancedFertilizerRecommendations 
                recommendations={recommendations}
                formData={formData}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;