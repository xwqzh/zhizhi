package cn.xu.model.vo.column;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.List;

/**
 * 专栏统计视图对象
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ColumnStatisticsVO implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * 日期维度，格式：yyyy-MM-dd
     */
    private List<String> dates;

    /**
     * 每日阅读量（按专栏内文章发布时间聚合）
     */
    private List<Long> viewCounts;

    /**
     * 每日订阅数
     */
    private List<Integer> subscribeCounts;
}
