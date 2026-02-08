from django.db import models


class Model3D(models.Model):
    record_name = models.CharField(max_length=255, unique=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    extension = models.CharField(max_length=50, blank=True, default='')
    alt_extension = models.CharField(max_length=50, blank=True, default='')
    thumbnail = models.BinaryField(blank=True, null=True)
    model = models.BinaryField(blank=True, null=True)
    alt_model = models.BinaryField(blank=True, null=True)

    class Meta:
        verbose_name = 'Model 3D'
        verbose_name_plural = 'Models 3D'

    def __str__(self):
        return f"{self.name} ({self.record_name})"


class Skybox(models.Model):
    record_name = models.CharField(max_length=255, unique=True)
    name = models.CharField(max_length=255)
    extension = models.CharField(max_length=50, blank=True, default='')
    height = models.FloatField(blank=True, null=True)
    exposure = models.FloatField(blank=True, null=True)
    shadow_intensity = models.FloatField(blank=True, null=True)
    shadow_softness = models.FloatField(blank=True, null=True)
    image = models.BinaryField(blank=True, null=True)

    class Meta:
        verbose_name_plural = 'Skyboxes'

    def __str__(self):
        return f"{self.name} ({self.record_name})"


class Screenshot(models.Model):
    model3d = models.ForeignKey(Model3D, on_delete=models.CASCADE, related_name='screenshots')
    skybox = models.ForeignKey(Skybox, on_delete=models.SET_NULL, blank=True, null=True, related_name='screenshots')
    model_scale = models.FloatField(default=1.0)
    yaw_angle = models.FloatField(default=0.0)
    camera_position_x = models.FloatField(default=0.0)
    camera_position_y = models.FloatField(default=0.0)
    camera_position_z = models.FloatField(default=0.0)
    camera_target_x = models.FloatField(default=0.0)
    camera_target_y = models.FloatField(default=0.0)
    camera_target_z = models.FloatField(default=0.0)
    image = models.BinaryField()

    def __str__(self):
        skybox_name = self.skybox.name if self.skybox else 'None'
        return f"Screenshot {self.id} - Model: {self.model3d.name}, Skybox: {skybox_name}"
