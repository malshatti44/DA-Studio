
import React, { useState, useEffect } from 'react';
import { ProductDetails, ImageConfig, GroundingSource } from './types';
import * as gemini from './services/geminiService';

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    aistudio?: AIStudio;
  }
}

const App: React.FC = () => {
  const [isKeySelected, setIsKeySelected] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Persistence
  const [productImage, setProductImage] = useState<string | null>(null);
  const [templateImage, setTemplateImage] = useState<string | null>(() => localStorage.getItem('dukkan_template'));
  
  const [productDetails, setProductDetails] = useState<ProductDetails>({
    title: '',
    price: '',
    sku: ''
  });

  // Results
  const [resultFeed, setResultFeed] = useState<string | null>(null);
  const [resultStory, setResultStory] = useState<string | null>(null);
  const [finalCaption, setFinalCaption] = useState<string>('');

  useEffect(() => {
    const checkKey = async () => {
      try {
        if (window.aistudio) {
          const selected = await window.aistudio.hasSelectedApiKey();
          setIsKeySelected(selected);
        } else {
          setIsKeySelected(true);
        }
      } catch (e) {
        setIsKeySelected(true);
      }
    };
    checkKey();
  }, []);

  const handleKeySelection = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
    }
    setIsKeySelected(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'product' | 'template') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (type === 'product') {
          setProductImage(result);
        } else {
          setTemplateImage(result);
          localStorage.setItem('dukkan_template', result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProduce = async () => {
    if (!productImage || !templateImage) {
      setError("يرجى رفع صورة المنتج والقالب أولاً.");
      return;
    }
    if (productDetails.sku.length !== 5) {
      setError("يجب أن يكون كود المنتج 5 أرقام.");
      return;
    }

    setLoading(true);
    setError(null);
    setResultFeed(null);
    setResultStory(null);
    setFinalCaption('');

    try {
      // 1. Prepare Text (Rephrasing & Caption)
      const { rephrasedTitle, caption } = await gemini.prepareMarketingText(productDetails);
      setFinalCaption(caption);

      // 2. Generate Images (Parallel)
      const [feedUrl, storyUrl] = await Promise.all([
        gemini.generateDukkanPost(productImage, templateImage, rephrasedTitle, productDetails.price, productDetails.sku, "4:5"),
        gemini.generateDukkanPost(productImage, templateImage, rephrasedTitle, productDetails.price, productDetails.sku, "9:16")
      ]);

      setResultFeed(feedUrl);
      setResultStory(storyUrl);
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء المعالجة.");
    } finally {
      setLoading(false);
    }
  };

  if (!isKeySelected) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-900 text-white text-center">
        <div className="max-w-md">
          <h1 className="text-3xl font-black mb-4">Dukkan Studio AI</h1>
          <p className="mb-8 text-slate-400">يرجى اختيار مفتاح API مفعل لبدء إنتاج بوستات دكان العاصمة.</p>
          <button onClick={handleKeySelection} className="bg-indigo-600 hover:bg-indigo-700 px-10 py-4 rounded-full font-bold transition-all shadow-xl">
            اختيار مفتاح API
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col lg:flex-row font-sans" dir="rtl">
      {/* Sidebar Controls */}
      <aside className="w-full lg:w-96 bg-slate-900 border-l border-slate-800 p-8 flex flex-col gap-8 shrink-0">
        <div>
          <h1 className="text-3xl font-black bg-gradient-to-l from-purple-400 to-indigo-500 bg-clip-text text-transparent">
            استوديو دكان
          </h1>
          <p className="text-xs text-slate-500 mt-2 uppercase tracking-widest font-bold">Smart Post Generator</p>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-bold text-slate-400">تفاصيل المنتج</label>
            <input 
              type="text" 
              placeholder="عنوان المنتج (سيتم إعادة صياغته)"
              value={productDetails.title}
              onChange={(e) => setProductDetails(p => ({...p, title: e.target.value}))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all"
            />
            <div className="flex gap-3">
              <input 
                type="text" 
                placeholder="السعر"
                value={productDetails.price}
                onChange={(e) => setProductDetails(p => ({...p, price: e.target.value}))}
                className="w-2/3 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
              />
              <div className="w-1/3 bg-slate-700 rounded-xl flex items-center justify-center font-bold text-sm">د.ك</div>
            </div>
            <input 
              type="text" 
              maxLength={5}
              placeholder="كود المنتج (5 أرقام)"
              value={productDetails.sku}
              onChange={(e) => setProductDetails(p => ({...p, sku: e.target.value.replace(/\D/g, '')}))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-bold text-slate-400">صورة المنتج</label>
            <div className="relative group border-2 border-dashed border-slate-700 rounded-2xl p-6 bg-slate-900/50 hover:border-purple-500 transition-all cursor-pointer">
              <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'product')} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
              <div className="flex flex-col items-center gap-2">
                {productImage ? <img src={productImage} className="h-32 object-contain rounded-lg shadow-lg" alt="Product" /> : <><i className="fa-solid fa-camera text-3xl text-slate-600"></i><span className="text-xs text-slate-500">اختر صورة المنتج</span></>}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-bold text-slate-400 flex justify-between">
              قالب دكان العاصمة
              {templateImage && <span className="text-[10px] text-green-500 flex items-center gap-1"><i className="fa-solid fa-check"></i> مدمج</span>}
            </label>
            {!templateImage && (
              <div className="relative group border-2 border-dashed border-slate-700 rounded-2xl p-6 bg-slate-900/50 hover:border-indigo-500 transition-all cursor-pointer">
                <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'template')} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                <div className="flex flex-col items-center gap-2">
                  <i className="fa-solid fa-puzzle-piece text-3xl text-slate-600"></i>
                  <span className="text-xs text-slate-500">ارفع القالب مرة واحدة فقط</span>
                </div>
              </div>
            )}
            {templateImage && (
              <button 
                onClick={() => { localStorage.removeItem('dukkan_template'); setTemplateImage(null); }}
                className="text-[10px] text-slate-500 hover:text-red-400 transition-colors"
              >
                تغيير القالب المدمج
              </button>
            )}
          </div>

          <button 
            disabled={loading || !productImage || !templateImage || productDetails.sku.length !== 5}
            onClick={handleProduce}
            className={`w-full py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all ${loading ? 'bg-slate-800 text-slate-600' : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:scale-[1.02] shadow-2xl shadow-purple-500/30 active:scale-95'}`}
          >
            {loading ? <i className="fa-solid fa-spinner fa-spin text-2xl"></i> : <i className="fa-solid fa-wand-magic-sparkles text-2xl"></i>}
            <span>إنتاج البوستات</span>
          </button>
        </div>
      </aside>

      {/* Main Preview Area */}
      <main className="flex-1 p-8 lg:p-12 overflow-y-auto space-y-12">
        {error && (
          <div className="bg-red-900/20 border border-red-500/50 text-red-200 p-4 rounded-2xl flex items-center justify-between">
            <span className="flex items-center gap-2 font-bold"><i className="fa-solid fa-circle-exclamation"></i> {error}</span>
            <button onClick={() => setError(null)}>&times;</button>
          </div>
        )}

        {!loading && !resultFeed && (
          <div className="h-full flex flex-col items-center justify-center opacity-20 space-y-4">
            <i className="fa-solid fa-images text-9xl"></i>
            <p className="text-xl font-bold">املأ البيانات لبدء العرض المباشر</p>
          </div>
        )}

        {loading && (
          <div className="h-full flex flex-col items-center justify-center space-y-8">
            <div className="relative">
              <div className="w-24 h-24 border-4 border-purple-500/20 rounded-full"></div>
              <div className="absolute inset-0 w-24 h-24 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
              <i className="fa-solid fa-microchip absolute inset-0 flex items-center justify-center text-3xl text-purple-400"></i>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-black text-purple-400 animate-pulse">جاري تشغيل Nano Banana Pro</h3>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">يتم الآن إنتاج نسختين (FEED + STORY) وإعادة صياغة العناوين...</p>
            </div>
          </div>
        )}

        {(resultFeed || resultStory || finalCaption) && !loading && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-12 animate-in fade-in duration-700">
            {/* Image Preview Column */}
            <div className="space-y-8">
              <h2 className="text-2xl font-black flex items-center gap-3">
                <i className="fa-solid fa-layer-group text-purple-400"></i>
                معاينة التصاميم
              </h2>
              
              <div className="flex flex-col gap-8">
                {resultFeed && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center px-2">
                      <span className="text-xs font-bold text-slate-500">Instagram Feed (4:5)</span>
                      <a href={resultFeed} download="dukkan-feed.png" className="text-xs text-purple-400 hover:underline">تحميل الصورة</a>
                    </div>
                    <img src={resultFeed} className="w-full max-w-md mx-auto rounded-3xl shadow-2xl border border-slate-800" alt="Feed Result" />
                  </div>
                )}
                {resultStory && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center px-2">
                      <span className="text-xs font-bold text-slate-500">Instagram Story (9:16)</span>
                      <a href={resultStory} download="dukkan-story.png" className="text-xs text-purple-400 hover:underline">تحميل الصورة</a>
                    </div>
                    <img src={resultStory} className="w-full max-w-sm mx-auto rounded-3xl shadow-2xl border border-slate-800" alt="Story Result" />
                  </div>
                )}
              </div>
            </div>

            {/* Caption Column */}
            <div className="space-y-8">
              <h2 className="text-2xl font-black flex items-center gap-3">
                <i className="fa-solid fa-quote-right text-indigo-400"></i>
                الكابشن المقترح
              </h2>
              
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6 shadow-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">جاهز للنسخ والنشر</span>
                  <button 
                    onClick={() => { navigator.clipboard.writeText(finalCaption); alert('تم النسخ!'); }}
                    className="bg-indigo-600/20 text-indigo-400 px-4 py-2 rounded-full text-xs font-bold hover:bg-indigo-600 hover:text-white transition-all"
                  >
                    نسخ النص بالكامل
                  </button>
                </div>
                <div className="prose prose-invert prose-sm">
                  <p className="whitespace-pre-wrap leading-relaxed text-slate-300 font-medium">
                    {finalCaption}
                  </p>
                </div>
              </div>

              <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-6">
                <h4 className="text-xs font-bold text-indigo-400 mb-3 flex items-center gap-2 uppercase">
                  <i className="fa-solid fa-lightbulb"></i> نصيحة الخبير
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  تمت إعادة صياغة العنوان بواسطة الذكاء الاصطناعي ليكون أكثر جذباً لجمهور انستغرام. تأكد من نشر النسخة العمودية في الستوري لزيادة التفاعل!
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
