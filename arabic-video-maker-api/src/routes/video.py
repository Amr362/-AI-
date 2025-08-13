from flask import Blueprint, request, jsonify
import time
import uuid

video_bp = Blueprint('video', __name__)

# محاكاة قاعدة بيانات للمشاريع
projects_db = {}

@video_bp.route('/projects', methods=['GET'])
def get_projects():
    """الحصول على قائمة المشاريع"""
    return jsonify({
        'success': True,
        'projects': list(projects_db.values())
    })

@video_bp.route('/projects', methods=['POST'])
def create_project():
    """إنشاء مشروع جديد"""
    data = request.get_json()
    
    if not data or not data.get('text'):
        return jsonify({
            'success': False,
            'error': 'النص مطلوب'
        }), 400
    
    project_id = str(uuid.uuid4())
    project = {
        'id': project_id,
        'text': data.get('text'),
        'dialect': data.get('dialect'),
        'voice': data.get('voice'),
        'status': 'draft',
        'created_at': time.time()
    }
    
    projects_db[project_id] = project
    
    return jsonify({
        'success': True,
        'project': project
    })

@video_bp.route('/tts/preview', methods=['POST'])
def preview_tts():
    """معاينة الصوت من النص"""
    data = request.get_json()
    
    if not data or not data.get('text'):
        return jsonify({
            'success': False,
            'error': 'النص مطلوب'
        }), 400
    
    # محاكاة معالجة TTS
    time.sleep(1)  # محاكاة وقت المعالجة
    
    return jsonify({
        'success': True,
        'audio_url': f'/api/audio/preview_{uuid.uuid4()}.wav',
        'duration': len(data.get('text', '')) * 0.1  # تقدير مدة الصوت
    })

@video_bp.route('/video/generate', methods=['POST'])
def generate_video():
    """بدء عملية إنتاج الفيديو"""
    data = request.get_json()
    
    if not data or not data.get('project_id'):
        return jsonify({
            'success': False,
            'error': 'معرف المشروع مطلوب'
        }), 400
    
    project_id = data.get('project_id')
    if project_id not in projects_db:
        return jsonify({
            'success': False,
            'error': 'المشروع غير موجود'
        }), 404
    
    # تحديث حالة المشروع
    projects_db[project_id]['status'] = 'processing'
    
    job_id = str(uuid.uuid4())
    
    return jsonify({
        'success': True,
        'job_id': job_id,
        'estimated_time': 30  # بالثواني
    })

@video_bp.route('/video/status/<job_id>', methods=['GET'])
def get_video_status(job_id):
    """متابعة حالة إنتاج الفيديو"""
    # محاكاة تقدم المعالجة
    import random
    progress = random.randint(10, 100)
    
    if progress >= 100:
        status = 'completed'
        video_url = f'/api/videos/{job_id}.mp4'
    else:
        status = 'processing'
        video_url = None
    
    return jsonify({
        'success': True,
        'status': status,
        'progress': progress,
        'video_url': video_url
    })

@video_bp.route('/voices', methods=['GET'])
def get_voices():
    """الحصول على قائمة الأصوات المتاحة"""
    voices = [
        {
            'id': 'male1',
            'name': 'أحمد',
            'gender': 'male',
            'dialect': 'msa',
            'description': 'صوت ذكوري هادئ',
            'sample_url': '/api/samples/male1.wav'
        },
        {
            'id': 'female1',
            'name': 'فاطمة',
            'gender': 'female',
            'dialect': 'msa',
            'description': 'صوت أنثوي واضح',
            'sample_url': '/api/samples/female1.wav'
        },
        {
            'id': 'male2',
            'name': 'محمد',
            'gender': 'male',
            'dialect': 'egyptian',
            'description': 'صوت ذكوري قوي - مصري',
            'sample_url': '/api/samples/male2.wav'
        },
        {
            'id': 'female2',
            'name': 'عائشة',
            'gender': 'female',
            'dialect': 'gulf',
            'description': 'صوت أنثوي دافئ - خليجي',
            'sample_url': '/api/samples/female2.wav'
        }
    ]
    
    return jsonify({
        'success': True,
        'voices': voices
    })

@video_bp.route('/dialects', methods=['GET'])
def get_dialects():
    """الحصول على قائمة اللهجات المدعومة"""
    dialects = [
        {
            'code': 'msa',
            'name': 'العربية الفصحى',
            'description': 'اللغة العربية الفصحى الحديثة'
        },
        {
            'code': 'egyptian',
            'name': 'المصرية',
            'description': 'اللهجة المصرية'
        },
        {
            'code': 'gulf',
            'name': 'الخليجية',
            'description': 'اللهجة الخليجية'
        },
        {
            'code': 'levantine',
            'name': 'الشامية',
            'description': 'اللهجة الشامية'
        },
        {
            'code': 'maghrebi',
            'name': 'المغاربية',
            'description': 'اللهجة المغاربية'
        }
    ]
    
    return jsonify({
        'success': True,
        'dialects': dialects
    })

