import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { 
  IconSettings as Settings, 
  IconFolder as Folder, 
  IconChevronRight as ChevronRight, 
  IconPlus as Plus,
  IconEdit as Edit,
  IconTrash as Trash,
  IconEye as Eye
} from '../Icons/SystemIcons';

const ConfiguracionGeneral = () => {
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [catToDelete, setCatToDelete] = useState(null);
  const [formData, setFormData] = useState({ nombre: '', descripcion: '' });
  const navigate = useNavigate();

  useEffect(() => {
    fetchCategorias();
  }, []);

  const fetchCategorias = async () => {
    try {
      const response = await api.get('/categorias');
      setCategorias(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching categorias:', error);
      setLoading(false);
    }
  };

  const openModal = (cat = null) => {
    if (cat) {
      setEditingCat(cat);
      setFormData({ nombre: cat.nombre, descripcion: cat.descripcion || '' });
    } else {
      setEditingCat(null);
      setFormData({ nombre: '', descripcion: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingCat) {
        await api.put(`/categorias/${editingCat.id_categoria}`, formData);
      } else {
        await api.post('/categorias', { ...formData, tip_id: null });
      }
      setIsModalOpen(false);
      fetchCategorias();
    } catch (error) {
      alert('Error al guardar: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDeleteClick = (e, cat) => {
    e.stopPropagation();
    setCatToDelete(cat);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await api.delete(`/categorias/${catToDelete.id_categoria}`);
      setIsDeleteModalOpen(false);
      fetchCategorias();
    } catch (error) {
      alert('Error: ' + (error.response?.data?.error || 'No se pudo eliminar. Verifique si tiene elementos asociados.'));
      setIsDeleteModalOpen(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '100px' }}>
        <div className="animate-spin" style={{ 
          width: '50px', 
          height: '50px', 
          border: '4px solid #f3f3f3', 
          borderTop: '4px solid var(--primary-blue)', 
          borderRadius: '50%' 
        }}></div>
      </div>
    );
  }

  return (
    <div className="config-container">
      <div className="config-header">
        <div className="config-title-section">
          <h1>
            <Settings size={32} />
            Configuración General
          </h1>
          <p>Gestiona las categorías y parámetros globales del sistema</p>
        </div>
        <button 
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          onClick={() => openModal()}
        >
          <Plus size={20} />
          Nueva Categoría
        </button>
      </div>

      <div className="config-grid">
        {categorias.map((cat) => (
          <div 
            key={cat.id_categoria}
            className="config-card"
            onClick={() => navigate(`/configuracion/${cat.id_categoria}`)}
          >
            <div className="config-card-icon">
              <Folder size={32} />
            </div>
            
            <h3>{cat.nombre}</h3>
            
            <p>
              {cat.descripcion || `Gestionar los elementos asociados a ${cat.nombre}`}
            </p>

            <div className="config-card-actions">
              <button 
                className="config-btn-icon" 
                title="Ver detalles"
                onClick={(e) => { e.stopPropagation(); navigate(`/configuracion/${cat.id_categoria}`); }}
              >
                <Eye size={18} />
              </button>
              <button 
                className="config-btn-icon" 
                title="Editar"
                onClick={(e) => { e.stopPropagation(); openModal(cat); }}
              >
                <Edit size={18} />
              </button>
              <button 
                className="config-btn-icon delete" 
                title="Eliminar"
                onClick={(e) => handleDeleteClick(e, cat)}
              >
                <Trash size={18} />
              </button>
            </div>

            <div className="config-card-footer" style={{ width: '100%', justifyContent: 'center' }}>
              <span className="status-badge status-warning" style={{ fontSize: '10px', padding: '4px 10px' }}>
                Catálogo Activo
              </span>
            </div>
          </div>
        ))}

        {/* Card Placeholder */}
        <div className="config-card" style={{ borderStyle: 'dashed', opacity: 0.6, cursor: 'default' }}>
          <div className="config-card-icon" style={{ background: '#f1f5f9', color: '#94a3b8' }}>
            <Settings size={24} />
          </div>
          <h3>Próximos Módulos</h3>
          <p>Nuevos parámetros se añadirán pronto.</p>
        </div>
      </div>

      {/* Modal para Crear/Editar Categoría Padre */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <div className="modal-icon">{editingCat ? '📝' : '📁'}</div>
              <div>
                <h3>{editingCat ? 'Editar Categoría' : 'Nueva Categoría Padre'}</h3>
                <p>{editingCat ? 'Modifica los datos de la categoría' : 'Crea una nueva categoría raíz para el sistema'}</p>
              </div>
            </div>
            
            <form onSubmit={handleSave} style={{ marginTop: '20px' }}>
              <div style={{ marginBottom: '15px' }}>
                <label className="form-label">Nombre de la Categoría</label>
                <input 
                  type="text" 
                  className="form-input" 
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  placeholder="Ej: Periodos Académicos"
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label className="form-label">Descripción (Opcional)</label>
                <textarea 
                  className="form-input" 
                  style={{ minHeight: '80px', resize: 'vertical' }}
                  value={formData.descripcion}
                  onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                  placeholder="Describe brevemente el propósito de esta categoría"
                />
              </div>
              
              <div className="modal-buttons">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingCat ? 'Guardar Cambios' : 'Crear Categoría'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación */}
      {isDeleteModalOpen && (
        <div className="modal-overlay" onClick={() => setIsDeleteModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <div className="modal-icon" style={{ background: '#fee2e2', color: '#ef4444' }}>🗑️</div>
              <div>
                <h3>Eliminar Categoría</h3>
                <p>¿Estás seguro de que deseas eliminar <strong>{catToDelete?.nombre}</strong>? Esta acción no se puede deshacer.</p>
              </div>
            </div>
            <div className="modal-buttons" style={{ marginTop: '25px' }}>
              <button className="btn btn-secondary" onClick={() => setIsDeleteModalOpen(false)}>
                Cancelar
              </button>
              <button className="btn btn-danger" onClick={handleConfirmDelete} style={{ background: '#ef4444', color: 'white' }}>
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfiguracionGeneral;
