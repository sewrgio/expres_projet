import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { 
  IconChevronLeft as ChevronLeft, 
  IconPlus as Plus, 
  IconEdit as Edit, 
  IconTrash as Trash2, 
  IconSave as Save, 
  IconX as X 
} from '../Icons/SystemIcons';

const DetalleCategoria = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [hijas, setHijas] = useState([]);
  const [padre, setPadre] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [catToDelete, setCatToDelete] = useState(null);
  
  const [formData, setFormData] = useState({ nombre: '', descripcion: '' });

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      // Obtener el nombre del padre
      const resPadres = await api.get('/categorias');
      const p = resPadres.data.find(c => c.id_categoria === parseInt(id));
      setPadre(p);

      // Obtener las hijas
      const response = await api.get(`/categorias/${id}`);
      setHijas(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/categorias/${editingId}`, formData);
      } else {
        await api.post('/categorias', { ...formData, tip_id: id });
      }
      setFormData({ nombre: '', descripcion: '' });
      setIsModalOpen(false);
      setEditingId(null);
      fetchData();
    } catch (error) {
      alert('Error al guardar: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDeleteClick = (cat) => {
    setCatToDelete(cat);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await api.delete(`/categorias/${catToDelete.id_categoria}`);
      setIsDeleteModalOpen(false);
      fetchData();
    } catch (error) {
      alert('Error al eliminar: ' + (error.response?.data?.error || error.message));
      setIsDeleteModalOpen(false);
    }
  };

  const startEdit = (cat) => {
    setEditingId(cat.id_categoria);
    setFormData({ nombre: cat.nombre, descripcion: cat.descripcion || '' });
    setIsModalOpen(true);
  };

  if (loading) return <div className="config-container text-center">Cargando...</div>;

  return (
    <div className="config-container">
      <button onClick={() => navigate('/configuracion')} className="btn-back">
        <ChevronLeft size={20} />
        Volver a Configuración
      </button>

      <div className="config-header" style={{ marginBottom: '30px' }}>
        <div className="config-title-section">
          <h1>{padre?.nombre || 'Categoría'}</h1>
          <p>Administra los elementos definidos para {padre?.nombre}</p>
        </div>
        <button 
          onClick={() => { setIsModalOpen(true); setEditingId(null); setFormData({ nombre: '', descripcion: '' }); }}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={20} />
          Agregar Elemento
        </button>
      </div>

      <div className="detail-table-card">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: '80px' }}>ID</th>
              <th>Nombre</th>
              <th>Descripción</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {hijas.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '50px', color: '#94a3b8', fontStyle: 'italic' }}>
                  No hay elementos registrados en esta categoría
                </td>
              </tr>
            ) : (
              hijas.map((h) => (
                <tr key={h.id_categoria}>
                  <td style={{ fontFamily: 'monospace', color: '#64748b' }}>#{h.id_categoria}</td>
                  <td style={{ fontWeight: '600' }}>{h.nombre}</td>
                  <td>{h.descripcion || '-'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="action-buttons">
                      <button onClick={() => startEdit(h)} className="action-btn edit-btn" title="Editar">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => handleDeleteClick(h)} className="action-btn delete-btn" title="Eliminar">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal para Crear/Editar Elemento */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <div className="modal-icon">{editingId ? '📝' : '➕'}</div>
              <div>
                <h3>{editingId ? 'Editar Elemento' : 'Nuevo Elemento'}</h3>
                <p>{editingId ? 'Modifica los datos del elemento' : 'Agrega un nuevo ítem a esta categoría'}</p>
              </div>
            </div>
            
            <form onSubmit={handleSave} style={{ marginTop: '20px' }}>
              <div style={{ marginBottom: '15px' }}>
                <label className="form-label">Nombre del Elemento</label>
                <input 
                  type="text" 
                  className="form-input" 
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  placeholder="Ej: Nuevo Valor"
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label className="form-label">Descripción (Opcional)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={formData.descripcion}
                  onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                  placeholder="Descripción breve"
                />
              </div>
              
              <div className="modal-buttons">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingId ? 'Guardar Cambios' : 'Agregar Elemento'}
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
                <h3>Eliminar Elemento</h3>
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

export default DetalleCategoria;
