import os
from flask import Blueprint, request, jsonify
import time
import uuid
import requests

video_bp = Blueprint("video", __name__)

# محاكاة قاعدة بيانات للمشاريع
projects_db = {}

ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1/text-to-speech"

STABLE_DIFFUSION_API_KEY = os.getenv("STABLE_DIFFUSION_API_KEY")
STABLE_DIFFUSION_API_URL = "https://stablediffusionapi.com/api/v5/text2video"

@video_bp.route("/projects", methods=["GET"])
def get_projects():
    """الحصول على قائمة المشاريع"""
    return jsonify({"success": True, "projects": list(projects_db.values())})

@video_bp.route("/projects", methods=["POST"])
def create_project():
    """إنشاء مشروع جديد"""
    data = request.get_json()

    if not data or not data.get("text"):  # Changed from 'text' to 'text'
        return jsonify({"success": False, "error": "النص مطلوب"}), 400

    project_id = str(uuid.uuid4())
    project = {
        "id": project_id,
        "text": data.get("text"),
        "dialect": data.get("dialect"),
        "voice": data.get("voice"),
        "status": "draft",
        "created_at": time.time(),
    }

    projects_db[project_id] = project

    return jsonify({"success": True, "project": project})

@video_bp.route("/tts/preview", methods=["POST"])
def preview_tts():
    """معاينة الصوت من النص باستخدام ElevenLabs"""
    data = request.get_json()

    if not data or not data.get("text") or not data.get("voice"):  # Added voice validation
        return jsonify({"success": False, "error": "النص والصوت مطلوبان"}), 400

    text = data.get("text")
    voice_id = data.get("voice")

    headers = {"xi-api-key": ELEVENLABS_API_KEY, "Content-Type": "application/json"}
    payload = {"text": text, "model_id": "eleven_multilingual_v2", "voice_settings": {"stability": 0.5, "similarity_boost": 0.75}}

    # ElevenLabs voice mapping (example, you'll need to map your UI voices to ElevenLabs voice_ids)
    # For now, I'll use a placeholder voice_id. You'll need to get actual voice_ids from ElevenLabs.
    # This is a crucial step for proper integration.
    # Example: if voice_id == 'male1': elevenlabs_voice_id = 'YOUR_MALE1_VOICE_ID'
    # For demonstration, I'll use a generic voice ID if not found.
    elevenlabs_voice_id = "21m00Tzpb8JJc4PzHMd8" # A generic male voice from ElevenLabs for testing
    if voice_id == 'female1':
        elevenlabs_voice_id = "EXAVITQu4vr4xnSDxMaL" # A generic female voice from ElevenLabs for testing

    try:
        response = requests.post(f"{ELEVENLABS_API_URL}/{elevenlabs_voice_id}", headers=headers, json=payload)
        response.raise_for_status()  # Raise an exception for HTTP errors

        audio_filename = f"audio_preview_{uuid.uuid4()}.mp3"
        static_dir = os.path.join(os.path.dirname(__file__), "..", "static")
        
        # إنشاء مجلد static إذا لم يكن موجوداً
        if not os.path.exists(static_dir):
            os.makedirs(static_dir)
            
        audio_path = os.path.join(static_dir, audio_filename)
        with open(audio_path, "wb") as f:
            f.write(response.content)

        return jsonify({"success": True, "audio_url": f"/static/{audio_filename}", "duration": len(text) * 0.05}) # Placeholder duration

    except requests.exceptions.RequestException as e:
        return jsonify({"success": False, "error": f"خطأ في الاتصال بـ ElevenLabs: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"success": False, "error": f"حدث خطأ: {str(e)}"}), 500

@video_bp.route("/video/generate", methods=["POST"])
def generate_video():
    """بدء عملية إنتاج الفيديو باستخدام Stable Diffusion API"""
    data = request.get_json()

    if not data or not data.get("project_id"):
        return jsonify({"success": False, "error": "معرف المشروع مطلوب"}), 400

    project_id = data.get("project_id")
    if project_id not in projects_db:
        return jsonify({"success": False, "error": "المشروع غير موجود"}), 404

    project = projects_db[project_id]
    text_prompt = project.get("text")

    if not text_prompt:
        return jsonify({"success": False, "error": "النص غير متوفر لإنشاء الفيديو"}), 400

    # التحقق من وجود مفتاح API
    if not STABLE_DIFFUSION_API_KEY:
        return jsonify({"success": False, "error": "مفتاح Stable Diffusion API غير متوفر. يرجى إضافته في الإعدادات"}), 500

    headers = {"Content-Type": "application/json"}
    payload = {
        "key": STABLE_DIFFUSION_API_KEY,
        "prompt": f"high quality video of {text_prompt}, cinematic, professional",
        "negative_prompt": "low quality, bad anatomy, blurry, deformed, disfigured, watermark, text",
        "scheduler": "UniPCMultistepScheduler",
        "seconds": 3,  # تقليل المدة لتوفير الوقت والتكلفة
        "guidance_scale": 7.5,
        "num_inference_steps": 20
    }

    try:
        print(f"Sending request to Stable Diffusion API with prompt: {text_prompt}")
        response = requests.post(STABLE_DIFFUSION_API_URL, headers=headers, json=payload, timeout=60)
        
        print(f"Response status: {response.status_code}")
        print(f"Response content: {response.text[:500]}...")  # أول 500 حرف للتشخيص
        
        if response.status_code == 401:
            return jsonify({"success": False, "error": "مفتاح API غير صحيح أو منتهي الصلاحية"}), 500
        elif response.status_code == 402:
            return jsonify({"success": False, "error": "رصيد API غير كافي"}), 500
        elif response.status_code == 429:
            return jsonify({"success": False, "error": "تم تجاوز حد الطلبات. يرجى المحاولة لاحقاً"}), 500
        
        response.raise_for_status()
        video_data = response.json()

        if video_data.get("status") == "success" and video_data.get("output"):
            video_url = video_data["output"][0]
            project["video_url"] = video_url
            project["status"] = "completed"
            return jsonify({"success": True, "video_url": video_url, "status": "completed"})
        elif video_data.get("status") == "processing":
            # في حالة المعالجة، يمكن إرجاع معرف المهمة للمتابعة لاحقاً
            return jsonify({"success": True, "status": "processing", "message": "الفيديو قيد المعالجة..."})
        else:
            error_msg = video_data.get("message", video_data.get("messege", "فشل في إنشاء الفيديو"))
            return jsonify({"success": False, "error": f"خطأ من API: {error_msg}"}), 500

    except requests.exceptions.Timeout:
        return jsonify({"success": False, "error": "انتهت مهلة الاتصال مع خدمة إنشاء الفيديو"}), 500
    except requests.exceptions.RequestException as e:
        return jsonify({"success": False, "error": f"خطأ في الاتصال: {str(e)}"}), 500
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        return jsonify({"success": False, "error": f"حدث خطأ غير متوقع: {str(e)}"}), 500

@video_bp.route("/video/status/<job_id>", methods=["GET"])
def get_video_status(job_id):
    """متابعة حالة إنتاج الفيديو (محاكاة - لم تعد تستخدم بعد دمج Stable Diffusion)"""
    # هذه الوظيفة لم تعد تستخدم بعد دمج Stable Diffusion API حيث أن API يوفر URL الفيديو مباشرة
    return jsonify({"success": False, "error": "هذه الوظيفة لم تعد مدعومة"}), 400

@video_bp.route("/voices", methods=["GET"])
def get_voices():
    """الحصول على قائمة الأصوات المتاحة"""
    voices = [
        {
            "id": "male1",
            "name": "أحمد",
            "gender": "male",
            "dialect": "msa",
            "description": "صوت ذكوري هادئ",
            "sample_url": "/api/samples/male1.wav",
        },
        {
            "id": "female1",
            "name": "فاطمة",
            "gender": "female",
            "dialect": "msa",
            "description": "صوت أنثوي واضح",
            "sample_url": "/api/samples/female1.wav",
        },
        {
            "id": "male2",
            "name": "محمد",
            "gender": "male",
            "dialect": "egyptian",
            "description": "صوت ذكوري قوي - مصري",
            "sample_url": "/api/samples/male2.wav",
        },
        {
            "id": "female2",
            "name": "عائشة",
            "gender": "female",
            "dialect": "gulf",
            "description": "صوت أنثوي دافئ - خليجي",
            "sample_url": "/api/samples/female2.wav",
        },
    ]

    return jsonify({"success": True, "voices": voices})

@video_bp.route("/dialects", methods=["GET"])
def get_dialects():
    """الحصول على قائمة اللهجات المدعومة"""
    dialects = [
        {"code": "msa", "name": "العربية الفصحى", "description": "اللغة العربية الفصحى الحديثة"},
        {"code": "egyptian", "name": "المصرية", "description": "اللهجة المصرية"},
        {"code": "gulf", "name": "الخليجية", "description": "اللهجة الخليجية"},
        {"code": "levantine", "name": "الشامية", "description": "اللهجة الشامية"},
        {"code": "maghrebi", "name": "المغاربية", "description": "اللهجة المغاربية"},
    ]

    return jsonify({"success": True, "dialects": dialects})



